import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appUrl, hashAuthToken } from "@/lib/auth-tokens";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const stored = token.length === 64
    ? await prisma.verificationToken.findUnique({ where: { token: hashAuthToken(token) } })
    : null;
  if (!stored || !stored.identifier.startsWith("email-verify:") || stored.expires <= new Date()) {
    return NextResponse.redirect(`${appUrl()}/login?verified=invalid`);
  }
  const userId = stored.identifier.slice("email-verify:".length);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } }),
    prisma.verificationToken.delete({ where: { identifier_token: { identifier: stored.identifier, token: stored.token } } }),
  ]);
  return NextResponse.redirect(`${appUrl()}/login?verified=true`);
}
