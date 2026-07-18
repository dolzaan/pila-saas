import { NextResponse } from "next/server";
import { z } from "zod";
import { parseFinancialMessage } from "@/lib/ai";

export const runtime = "nodejs";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 10;
const visitors = new Map<string, { count: number; resetAt: number }>();

const ChatSchema = z.object({
  message: z.string().trim().min(1).max(500),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(600),
  })).max(8).default([]),
});

function getClientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

function allowRequest(ip: string) {
  const now = Date.now();

  if (visitors.size > 500) {
    for (const [key, value] of visitors) {
      if (value.resetAt <= now) visitors.delete(key);
    }
  }

  const current = visitors.get(ip);
  if (!current || current.resetAt <= now) {
    visitors.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (current.count >= MAX_REQUESTS) return false;
  current.count += 1;
  return true;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!allowRequest(ip)) {
    return NextResponse.json(
      { error: "Você enviou muitas mensagens. Aguarde alguns minutos e tente novamente." },
      { status: 429 },
    );
  }

  try {
    const body: unknown = await request.json();
    const parsed = ChatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Mensagem inválida." }, { status: 400 });
    }

    const transcript = parsed.data.history
      .slice(-6)
      .map((item) => `${item.role === "user" ? "Visitante" : "Pila"}: ${item.content}`)
      .join("\n");

    const visitorContext = `
Este atendimento acontece no chat público da landing page.
O visitante ainda não conectou uma conta, portanto você não possui acesso a dados financeiros pessoais e não pode registrar movimentações.
Converse de forma curta, útil e natural sobre o Pila e sobre organização financeira geral.
Quando o visitante quiser registrar transações, consultar dados pessoais ou testar o produto, explique que ele deve criar a conta e conectar o WhatsApp.
Não diga que uma transação foi registrada neste chat.

Histórico recente:
${transcript || "Início da conversa."}
    `.trim();

    const result = await parseFinancialMessage(parsed.data.message, visitorContext);
    const fallback = "Posso explicar como a IA do Pila funciona no WhatsApp ou ajudar você a começar seu teste grátis.";

    let reply = result.replyMessage || fallback;
    if (result.isTransaction) {
      reply = "Entendi a movimentação, mas este chat é uma demonstração e não salva dados. Crie sua conta e conecte o WhatsApp para registrar tudo automaticamente.";
    }
    if (reply.includes("Chave do Gemini")) {
      reply = "O chat está temporariamente indisponível. Você ainda pode conhecer os recursos da página ou criar sua conta grátis.";
    }

    return NextResponse.json(
      { reply },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[Landing chat] Erro:", error);
    return NextResponse.json(
      { error: "Não consegui responder agora. Tente novamente em instantes." },
      { status: 500 },
    );
  }
}
