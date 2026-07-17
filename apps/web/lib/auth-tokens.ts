import { createHash, randomBytes, randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";

type TokenPurpose = "email-verify" | "password-reset";

export function hashAuthToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueAuthToken(userId: string, purpose: TokenPurpose, ttlMinutes: number) {
  const identifier = `${purpose}:${userId}`;
  const existing = await prisma.verificationToken.findFirst({
    where: { identifier, expires: { gt: new Date() } },
  });
  if (existing) return null;

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  const token = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: {
      identifier,
      token: hashAuthToken(token),
      expires: new Date(Date.now() + ttlMinutes * 60_000),
    },
  });
  return token;
}

export async function issueEmailVerificationCode(identifier: string, ttlMinutes = 10) {
  const existing = await prisma.verificationToken.findFirst({
    where: { identifier, expires: { gt: new Date() } },
  });
  if (existing) return null;

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  const code = randomInt(100_000, 1_000_000).toString();
  await prisma.verificationToken.create({
    data: {
      identifier,
      token: hashAuthToken(`${identifier}:${code}`),
      expires: new Date(Date.now() + ttlMinutes * 60_000),
    },
  });
  return code;
}

export async function consumeEmailVerificationCode(identifier: string, code: string) {
  const stored = await prisma.verificationToken.findFirst({ where: { identifier } });
  if (!stored || stored.expires <= new Date() || stored.attempts >= 5) {
    if (stored) await prisma.verificationToken.deleteMany({ where: { identifier } });
    return false;
  }

  const expected = hashAuthToken(`${identifier}:${code}`);
  if (stored.token !== expected) {
    await prisma.verificationToken.update({
      where: { identifier_token: { identifier, token: stored.token } },
      data: { attempts: { increment: 1 } },
    });
    return false;
  }

  await prisma.verificationToken.delete({
    where: { identifier_token: { identifier, token: stored.token } },
  });
  return true;
}

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://usepila.vercel.app").replace(/\/$/, "");
}
