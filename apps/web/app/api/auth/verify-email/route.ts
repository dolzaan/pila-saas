import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  appUrl,
  consumeEmailVerificationCode,
  hashAuthToken,
} from "@/lib/auth-tokens";
import {
  checkRateLimits,
  getClientIp,
  privateRateLimitKey,
  rateLimitHeaders,
  RateLimitUnavailableError,
} from "@/lib/rate-limit";

const VERIFY_EMAIL_WINDOW_MS = 10 * 60 * 1000;
const VERIFY_EMAIL_IP_LIMIT = 20;
const VERIFY_EMAIL_ADDRESS_LIMIT = 10;

const VerifySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = null;
    }

    const parsed = VerifySchema.safeParse(body);
    const rules = [
      {
        key: privateRateLimitKey(
          "auth:verify-email:ip",
          getClientIp(request)
        ),
        limit: VERIFY_EMAIL_IP_LIMIT,
        windowMs: VERIFY_EMAIL_WINDOW_MS,
      },
      ...(parsed.success
        ? [{
            key: privateRateLimitKey(
              "auth:verify-email:address",
              parsed.data.email
            ),
            limit: VERIFY_EMAIL_ADDRESS_LIMIT,
            windowMs: VERIFY_EMAIL_WINDOW_MS,
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
        { error: "Código inválido." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, emailVerified: true },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Código inválido ou expirado." },
        { status: 400 }
      );
    }
    if (user.emailVerified) {
      return NextResponse.json({ success: true });
    }

    const identifier = `email-verify:${user.id}`;
    const valid = await consumeEmailVerificationCode(
      identifier,
      parsed.data.code
    );
    if (!valid) {
      return NextResponse.json(
        { error: "Código inválido ou expirado." },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      console.error(
        "[verify-email] Rate limiting indisponível:",
        error.message
      );
      return NextResponse.json(
        { error: "Verificação temporariamente indisponível." },
        { status: 503 }
      );
    }

    console.error(
      "[verify-email] Erro:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Não foi possível verificar o código." },
      { status: 500 }
    );
  }
}

// Mantém compatibilidade com links de verificação enviados antes desta atualização.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const stored = token.length === 64
    ? await prisma.verificationToken.findUnique({
        where: { token: hashAuthToken(token) },
      })
    : null;

  if (
    !stored ||
    !stored.identifier.startsWith("email-verify:") ||
    stored.expires <= new Date()
  ) {
    return NextResponse.redirect(`${appUrl()}/login?verified=invalid`);
  }

  const userId = stored.identifier.slice("email-verify:".length);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
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
  return NextResponse.redirect(`${appUrl()}/login?verified=true`);
}
