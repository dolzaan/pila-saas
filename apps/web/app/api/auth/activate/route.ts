import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashActivationToken } from "@/lib/account-activation";

const ActivateSchema = z.object({
  token: z.string().length(64),
  password: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres")
    .max(128)
    .regex(/[A-Z]/, "Inclua uma letra maiúscula")
    .regex(/[a-z]/, "Inclua uma letra minúscula")
    .regex(/[0-9]/, "Inclua um número")
    .regex(/[^A-Za-z0-9]/, "Inclua um caractere especial"),
});

export async function POST(request: Request) {
  try {
    const parsed = ActivateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const tokenHash = hashActivationToken(parsed.data.token);
    const activation = await prisma.accountActivationToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true, passwordHash: true } } },
    });

    if (!activation || activation.usedAt || activation.expiresAt <= new Date()) {
      return NextResponse.json({ error: "Este link é inválido ou expirou." }, { status: 400 });
    }
    if (activation.user.passwordHash) {
      return NextResponse.json({ error: "Esta conta já foi ativada." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: activation.userId }, data: { passwordHash } }),
      prisma.accountActivationToken.update({ where: { id: activation.id }, data: { usedAt: new Date() } }),
    ]);

    return NextResponse.json({ success: true, email: activation.user.email });
  } catch (error) {
    console.error("[activate] Erro ao ativar conta:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Não foi possível ativar a conta." }, { status: 500 });
  }
}
