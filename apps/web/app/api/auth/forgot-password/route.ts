import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { appUrl, issueAuthToken } from "@/lib/auth-tokens";
import { sendEmail } from "@/lib/email";
import {
  checkRateLimits,
  getClientIp,
  privateRateLimitKey,
  rateLimitHeaders,
  RateLimitUnavailableError,
} from "@/lib/rate-limit";

const FORGOT_PASSWORD_WINDOW_MS = 60 * 60 * 1000;
const FORGOT_PASSWORD_IP_LIMIT = 10;
const FORGOT_PASSWORD_EMAIL_LIMIT = 3;

const Schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
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
          "auth:forgot-password:ip",
          getClientIp(request)
        ),
        limit: FORGOT_PASSWORD_IP_LIMIT,
        windowMs: FORGOT_PASSWORD_WINDOW_MS,
      },
      ...(parsed.success
        ? [{
            key: privateRateLimitKey(
              "auth:forgot-password:email",
              parsed.data.email
            ),
            limit: FORGOT_PASSWORD_EMAIL_LIMIT,
            windowMs: FORGOT_PASSWORD_WINDOW_MS,
          }]
        : []),
    ];
    const decision = await checkRateLimits(rules);
    if (!decision.allowed) {
      return NextResponse.json(
        { error: "Muitas solicitações. Aguarde e tente novamente." },
        { status: 429, headers: rateLimitHeaders(decision) }
      );
    }

    // Mantém resposta indistinguível para e-mail inválido ou inexistente.
    if (!parsed.success) {
      return NextResponse.json({ success: true });
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, email: true, name: true },
    });
    if (user) {
      const token = await issueAuthToken(user.id, "password-reset", 30);
      if (token) {
        const url = `${appUrl()}/reset-password?token=${token}`;
        await sendEmail({
          to: user.email,
          template: "password-reset",
          name: user.name,
          actionUrl: url,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      console.error(
        "[forgot-password] Rate limiting indisponível:",
        error.message
      );
      return NextResponse.json(
        { error: "Recuperação temporariamente indisponível." },
        { status: 503 }
      );
    }

    console.error(
      "[forgot-password] Erro:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Não foi possível processar a solicitação." },
      { status: 500 }
    );
  }
}
