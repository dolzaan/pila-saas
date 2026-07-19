import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueEmailVerificationCode } from "@/lib/auth-tokens";
import { sendEmail } from "@/lib/email";
import {
  checkRateLimits,
  getClientIp,
  privateRateLimitKey,
  rateLimitHeaders,
  RateLimitUnavailableError,
} from "@/lib/rate-limit";

const REGISTER_WINDOW_MS = 60 * 60 * 1000;
const REGISTER_IP_LIMIT = 5;
const REGISTER_EMAIL_LIMIT = 3;

const RegisterSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
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
    const ipDecision = await checkRateLimits([
      {
        key: privateRateLimitKey("auth:register:ip", getClientIp(request)),
        limit: REGISTER_IP_LIMIT,
        windowMs: REGISTER_WINDOW_MS,
      },
    ]);
    if (!ipDecision.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas de cadastro. Aguarde e tente novamente." },
        { status: 429, headers: rateLimitHeaders(ipDecision) }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;
    const emailDecision = await checkRateLimits([
      {
        key: privateRateLimitKey("auth:register:email", email),
        limit: REGISTER_EMAIL_LIMIT,
        windowMs: REGISTER_WINDOW_MS,
      },
    ]);
    if (!emailDecision.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas de cadastro. Aguarde e tente novamente." },
        { status: 429, headers: rateLimitHeaders(emailDecision) }
      );
    }

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

    const identifier = `email-verify:${user.id}`;
    const verificationCode = await issueEmailVerificationCode(identifier);
    if (verificationCode) {
      const sent = await sendEmail({
        to: user.email,
        template: "email-verification",
        name: user.name,
        verificationCode,
      });
      if (!sent) await prisma.verificationToken.deleteMany({ where: { identifier } });
    }

    return NextResponse.json(
      { message: "Conta criada. Confirme seu e-mail para continuar.", user, requiresVerification: true },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof RateLimitUnavailableError) {
      console.error("[register] Rate limiting indisponível:", err.message);
      return NextResponse.json(
        { error: "Cadastro temporariamente indisponível. Tente novamente em instantes." },
        { status: 503 }
      );
    }

    // Não logar dados sensíveis do body
    console.error("[register] Erro ao criar usuário:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json(
      { error: "Erro interno. Tente novamente." },
      { status: 500 }
    );
  }
}
