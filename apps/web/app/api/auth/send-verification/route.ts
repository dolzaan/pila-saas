import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appUrl, issueAuthToken } from "@/lib/auth-tokens";
import { sendEmail } from "@/lib/email";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.emailVerified) return NextResponse.json({ success: true });

  const token = await issueAuthToken(user.id, "email-verify", 24 * 60);
  if (token) {
    const url = `${appUrl()}/api/auth/verify-email?token=${token}`;
    await sendEmail({
      to: user.email,
      subject: "Confirme seu e-mail no Pila",
      html: `<p>Confirme seu e-mail para proteger sua conta.</p><p><a href="${url}">Confirmar meu e-mail</a></p>`,
    });
  }
  return NextResponse.json({ success: true });
}
