import { auth } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";
import { parseFinancialSummaryQuestion } from "@/lib/financial-summary-query";
import {
  buildUnlinkedGreetingReply,
  buildUnlinkedWhatsappReply,
  buildWhatsappAccessCheckFailureReply,
  buildWhatsappLinkHelpReply,
  canUnlinkedWhatsappMessageReachBot,
  isWhatsappGreeting,
  isWhatsappLinkHelpIntent,
  shouldCheckWhatsappAccountAccess,
  type WhatsappGateReplyKind,
} from "@/lib/whatsapp-access-gate";

type WhatsappWebhookPayload = {
  data?: {
    key?: {
      id?: string;
      remoteJid?: string;
      fromMe?: boolean;
    };
    message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
      imageMessage?: { caption?: string };
      audioMessage?: unknown;
      documentMessage?: { caption?: string };
      base64?: string;
    };
    base64?: string;
  };
};

type WhatsappAccessStatus = {
  linked: boolean;
  onboardingActive: boolean;
};

type WhatsappGateContext = {
  phone: string;
  remoteJid: string;
  messageId: string;
  text: string;
  hasMedia: boolean;
};

function getWhatsappGateContext(payload: WhatsappWebhookPayload): WhatsappGateContext | null {
  const key = payload.data?.key;
  const message = payload.data?.message;
  const remoteJid = key?.remoteJid || "";

  if (!message || !remoteJid || key?.fromMe || remoteJid.includes("@g.us")) {
    return null;
  }

  const phone = remoteJid.split("@")[0]?.replace(/\D/g, "") || "";
  if (!/^\d{10,15}$/.test(phone)) return null;

  const text = message.conversation
    || message.extendedTextMessage?.text
    || message.imageMessage?.caption
    || message.documentMessage?.caption
    || "";

  const hasMedia = Boolean(
    message.imageMessage
    || message.audioMessage
    || message.documentMessage
    || message.base64
    || payload.data?.base64,
  );

  return {
    phone,
    remoteJid,
    messageId: typeof key?.id === "string" ? key.id.trim() : "",
    text,
    hasMedia,
  };
}

async function checkWhatsappAccess(
  req: NextRequest,
  phone: string,
): Promise<WhatsappAccessStatus | null> {
  const statusUrl = new URL("/api/internal/whatsapp-access", req.url);
  statusUrl.searchParams.set("phone", phone);

  const headers = new Headers();
  const webhookSecret = req.headers.get("x-pila-webhook-secret");
  const cookie = req.headers.get("cookie");
  if (webhookSecret) headers.set("x-pila-webhook-secret", webhookSecret);
  if (cookie) headers.set("cookie", cookie);

  const response = await fetch(statusUrl, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  // Chamadas sem credencial ou com número inválido continuam para o webhook,
  // que mantém a resposta de autorização/validação original.
  if (response.status === 400 || response.status === 401) return null;
  if (!response.ok) throw new Error(`Falha ao verificar vínculo: ${response.status}`);

  const data = await response.json() as {
    linked?: boolean;
    onboardingActive?: boolean;
  };

  return {
    linked: data.linked === true,
    onboardingActive: data.onboardingActive === true,
  };
}

async function sendWhatsappGateReply(
  req: NextRequest,
  context: WhatsappGateContext,
  replyKind: WhatsappGateReplyKind,
) {
  const webhookSecret = req.headers.get("x-pila-webhook-secret");

  // O simulador administrativo exibe a resposta recebida no JSON e não deve
  // disparar uma mensagem real para o número digitado na interface.
  if (!webhookSecret) return;

  const replyUrl = new URL("/api/internal/whatsapp-gate-reply", req.url);
  const response = await fetch(replyUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-pila-webhook-secret": webhookSecret,
    },
    body: JSON.stringify({
      remoteJid: context.remoteJid,
      messageId: context.messageId,
      replyKind,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Falha ao enviar resposta da trava: ${response.status}`);
  }
}

async function forwardWhatsappFinancialSummary(
  req: NextRequest,
  context: WhatsappGateContext,
) {
  const summaryUrl = new URL("/api/internal/whatsapp-financial-summary", req.url);
  const headers = new Headers({ "content-type": "application/json" });
  const webhookSecret = req.headers.get("x-pila-webhook-secret");
  const cookie = req.headers.get("cookie");
  if (webhookSecret) headers.set("x-pila-webhook-secret", webhookSecret);
  if (cookie) headers.set("cookie", cookie);

  const response = await fetch(summaryUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      phone: context.phone,
      remoteJid: context.remoteJid,
      messageId: context.messageId,
      text: context.text,
    }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({
    success: false,
    retryable: true,
  }));
  const retryAfter = response.headers.get("retry-after");

  return NextResponse.json(payload, {
    status: response.status,
    headers: retryAfter ? { "Retry-After": retryAfter } : undefined,
  });
}

function gateReplyMessage(replyKind: WhatsappGateReplyKind) {
  if (replyKind === "GREETING") return buildUnlinkedGreetingReply();
  if (replyKind === "LINK_HELP") return buildWhatsappLinkHelpReply();
  if (replyKind === "CHECK_FAILED") return buildWhatsappAccessCheckFailureReply();
  return buildUnlinkedWhatsappReply();
}

/**
 * Middleware de proteção de rotas usando Auth.js v5.
 * - /dashboard/* → exige autenticação
 * - /login, /register → redireciona para /dashboard se já autenticado
 * - /api/webhooks/whatsapp → bloqueia acesso financeiro antes da IA
 * - / → landing pública (usuários autenticados seguem com acesso ao dashboard)
 */
export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth?.user;
  let whatsappContext: WhatsappGateContext | null = null;

  // A barreira é aplicada apenas a chamadas que podem ser legítimas:
  // webhook com segredo ou simulador com sessão administrativa.
  if (
    pathname === "/api/webhooks/whatsapp"
    && req.method === "POST"
    && (
      Boolean(req.headers.get("x-pila-webhook-secret"))
      || req.auth?.user?.role === "ADMIN"
    )
  ) {
    try {
      const payload = await req.clone().json() as WhatsappWebhookPayload;
      whatsappContext = getWhatsappGateContext(payload);

      if (
        whatsappContext
        && shouldCheckWhatsappAccountAccess(
          whatsappContext.text,
          whatsappContext.hasMedia,
        )
      ) {
        const access = await checkWhatsappAccess(req, whatsappContext.phone);

        if (access && !access.linked && !access.onboardingActive) {
          let replyKind: WhatsappGateReplyKind | null = null;

          if (!whatsappContext.hasMedia && isWhatsappGreeting(whatsappContext.text)) {
            replyKind = "GREETING";
          } else {
            const canContinue = !whatsappContext.hasMedia
              && canUnlinkedWhatsappMessageReachBot(whatsappContext.text);

            if (!canContinue) {
              replyKind = isWhatsappLinkHelpIntent(whatsappContext.text)
                ? "LINK_HELP"
                : "UNLINKED";
            }
          }

          if (replyKind) {
            await sendWhatsappGateReply(req, whatsappContext, replyKind);
            const replyMessage = gateReplyMessage(replyKind);

            return NextResponse.json({
              success: true,
              blocked: replyKind !== "GREETING",
              accountStatus: "UNLINKED",
              replyMessage,
            });
          }
        }

        if (
          access?.linked
          && !whatsappContext.hasMedia
          && parseFinancialSummaryQuestion(whatsappContext.text)
        ) {
          try {
            return await forwardWhatsappFinancialSummary(req, whatsappContext);
          } catch (summaryError) {
            console.error("[WhatsApp Summary] Falha ao encaminhar consulta:", summaryError);
            return NextResponse.json(
              { success: false, retryable: true },
              { status: 503, headers: { "Retry-After": "30" } },
            );
          }
        }
      }
    } catch (error) {
      console.error("[WhatsApp Access Gate] Erro:", error);

      if (whatsappContext) {
        try {
          await sendWhatsappGateReply(req, whatsappContext, "CHECK_FAILED");
        } catch (replyError) {
          console.error("[WhatsApp Access Gate] Falha ao responder erro:", replyError);
        }
      }

      return NextResponse.json(
        {
          success: false,
          blocked: true,
          retryable: true,
          accountStatus: "UNKNOWN",
          replyMessage: buildWhatsappAccessCheckFailureReply(),
        },
        {
          status: 503,
          headers: { "Retry-After": "30" },
        },
      );
    }
  }

  // Rotas protegidas: /dashboard e subpáginas
  if (pathname.startsWith("/dashboard")) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Rotas de auth: redireciona para /dashboard se já logado
  if (
    isAuthenticated
    && (pathname === "/login" || pathname === "/register")
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.ico$).*)",
  ],
};
