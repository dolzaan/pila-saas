import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { appUrl, consumeEmailVerificationCode, hashAuthToken } from "@/lib/auth-tokens";

const VerifySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  const parsed = VerifySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Código inválido." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return NextResponse.json({ error: "Código inválido ou expirado." }, { status: 400 });
  if (user.emailVerified) return NextResponse.json({ success: true });

  const identifier = `email-verify:${user.id}`;
  const valid = await consumeEmailVerificationCode(identifier, parsed.data.code);
  if (!valid) {
    return NextResponse.json({ error: "Código inválido ou expirado." }, { status: 400 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
  return NextResponse.json({ success: true });
}

// Mantém compatibilidade com links de verificação enviados antes desta atualização.
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
