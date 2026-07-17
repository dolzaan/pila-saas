import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { appUrl, issueAuthToken } from "@/lib/auth-tokens";
import { sendEmail } from "@/lib/email";

const Schema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });

export async function POST(request: Request) {
  const parsed = Schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: true });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (user) {
    const token = await issueAuthToken(user.id, "password-reset", 30);
    if (token) {
      const url = `${appUrl()}/reset-password?token=${token}`;
      await sendEmail({
        to: user.email,
        subject: "Redefina sua senha do Pila",
        html: `<p>Olá${user.name ? `, ${user.name}` : ""}!</p><p>Use o link abaixo para criar uma nova senha. Ele expira em 30 minutos.</p><p><a href="${url}">Redefinir minha senha</a></p><p>Se você não pediu isso, ignore este e-mail.</p>`,
      });
    }
  }
  return NextResponse.json({ success: true });
}
