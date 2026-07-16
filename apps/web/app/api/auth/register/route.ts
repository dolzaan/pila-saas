import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const RegisterSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  email: z.string().email("E-mail inválido"),
  password: z
    .string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .max(128)
    .regex(/[A-Z]/, "A senha precisa conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "A senha precisa conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "A senha precisa conter pelo menos um número")
    .regex(/[^A-Za-z0-9]/, "A senha precisa conter pelo menos um caractere especial"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    // Verifica se e-mail já existe
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Este e-mail já está cadastrado." },
        { status: 409 }
      );
    }

    // Hash da senha com argon2-compatible bcrypt (cost factor 12)
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { message: "Conta criada com sucesso.", user },
      { status: 201 }
    );
  } catch (err) {
    // Não logar dados sensíveis do body
    console.error("[register] Erro ao criar usuário:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json(
      { error: "Erro interno. Tente novamente." },
      { status: 500 }
    );
  }
}
