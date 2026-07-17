import { createHash, randomBytes } from "node:crypto";
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

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://usepila.vercel.app").replace(/\/$/, "");
}
