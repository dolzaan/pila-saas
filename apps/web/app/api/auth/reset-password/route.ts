import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashAuthToken } from "@/lib/auth-tokens";
import {
  checkRateLimits,
  getClientIp,
  privateRateLimitKey,
  rateLimitHeaders,
  RateLimitUnavailableError,
} from "@/lib/rate-limit";

const RESET_PASSWORD_WINDOW_MS = 30 * 60 * 1000;
const RESET_PASSWORD_IP_LIMIT = 10;
const RESET_PASSWORD_TOKEN_LIMIT = 5;

const Schema = z.object({
  token: z.string().length(64),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/),
});

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = null;
    }

    const parsed = Schema.safeParse(body);
    const rules = [
      {
        key: privateRateLimitKey(
          "auth:reset-password:ip",
          getClientIp(request)
        ),
        limit: RESET_PASSWORD_IP_LIMIT,
        windowMs: RESET_PASSWORD_WINDOW_MS,
      },
      ...(parsed.success
        ? [{
            key: privateRateLimitKey(
              "auth:reset-password:token",
              parsed.data.token
            ),
            limit: RESET_PASSWORD_TOKEN_LIMIT,
            windowMs: RESET_PASSWORD_WINDOW_MS,
          }]
        : []),
    ];
    const decision = await checkRateLimits(rules);
    if (!decision.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde e tente novamente." },
        { status: 429, headers: rateLimitHeaders(decision) }
      );
    }

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos." },
        { status: 400 }
      );
    }

    const stored = await prisma.verificationToken.findUnique({
      where: { token: hashAuthToken(parsed.data.token) },
    });
    if (
      !stored ||
      !stored.identifier.startsWith("password-reset:") ||
      stored.expires <= new Date()
    ) {
      return NextResponse.json(
        { error: "Link inválido ou expirado." },
        { status: 400 }
      );
    }

    const userId = stored.identifier.slice("password-reset:".length);
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          // O link de redefinição enviado ao endereço comprova a posse do e-mail.
          emailVerified: new Date(),
          sessionVersion: { increment: 1 },
        },
      }),
      prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: stored.identifier,
            token: stored.token,
          },
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      console.error(
        "[reset-password] Rate limiting indisponível:",
        error.message
      );
      return NextResponse.json(
        { error: "Redefinição temporariamente indisponível." },
        { status: 503 }
      );
    }

    console.error(
      "[reset-password] Erro:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Não foi possível redefinir a senha." },
      { status: 500 }
    );
  }
}
