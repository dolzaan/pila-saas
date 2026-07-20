import { auth } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";
import {
  buildUnlinkedWhatsappReply,
  buildWhatsappAccessCheckFailureReply,
  shouldCheckWhatsappAccountAccess,
} from "@/lib/whatsapp-access-gate";

type WhatsappWebhookPayload = {
  data?: {
    key?: {
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

function getWhatsappGateContext(payload: WhatsappWebhookPayload) {
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

  return { phone, text, hasMedia };
}

async function checkWhatsappLink(req: NextRequest, phone: string) {
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

  const data = await response.json() as { linked?: boolean };
  return data.linked === true;
}

/**
 * Middleware de proteção de rotas usando Auth.js v5.
 * - /dashboard/* → exige autenticação
 * - /login, /register → redireciona para /dashboard se já autenticado
 * - /api/webhooks/whatsapp → bloqueia operações financeiras antes da IA
 * - / → landing pública (usuários autenticados seguem com acesso ao dashboard)
 */
export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth?.user;

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
      const context = getWhatsappGateContext(payload);

      if (
        context
        && shouldCheckWhatsappAccountAccess(context.text, context.hasMedia)
      ) {
        const linked = await checkWhatsappLink(req, context.phone);

        if (linked === false) {
          return NextResponse.json({
            success: true,
            blocked: true,
            accountStatus: "UNLINKED",
            replyMessage: buildUnlinkedWhatsappReply(),
          });
        }
      }
    } catch (error) {
      console.error("[WhatsApp Access Gate] Erro:", error);
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
