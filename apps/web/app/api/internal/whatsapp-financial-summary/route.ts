import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendWhatsAppMessage } from "@/lib/evolution";
import {
  buildFinancialSummaryReply,
  parseFinancialSummaryQuestion,
} from "@/lib/financial-summary-query";
import { prisma } from "@/lib/prisma";
import { getUserSubscriptionStatus, hasProAccess } from "@/lib/subscription";
import {
  claimWhatsappInboundMessage,
  completeWhatsappInboundMessage,
  failWhatsappInboundMessage,
} from "@/lib/whatsapp-inbound";

function secretsMatch(provided: string | null, expected: string) {
  if (!provided) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length
    && timingSafeEqual(providedBuffer, expectedBuffer);
}

async function authorize(request: Request) {
  const expectedSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
  const providedSecret = request.headers.get("x-pila-webhook-secret");
  if (expectedSecret && secretsMatch(providedSecret, expectedSecret)) {
    return { authorized: true, realWebhook: true } as const;
  }

  const session = await auth();
  if (session?.user?.role === "ADMIN") {
    return { authorized: true, realWebhook: false } as const;
  }

  return { authorized: false, realWebhook: false } as const;
}

export async function POST(request: Request) {
  let claimedMessageId: string | null = null;
  const authorization = await authorize(request);
  if (!authorization.authorized) {
    const status = process.env.WHATSAPP_WEBHOOK_SECRET ? 401 : 503;
    return NextResponse.json({ success: false }, { status });
  }

  const payload = await request.json().catch(() => null) as {
    phone?: unknown;
    remoteJid?: unknown;
    messageId?: unknown;
    text?: unknown;
  } | null;

  const phone = typeof payload?.phone === "string" ? payload.phone.replace(/\D/g, "") : "";
  const remoteJid = typeof payload?.remoteJid === "string" ? payload.remoteJid.trim() : "";
  const messageId = typeof payload?.messageId === "string"
    ? payload.messageId.trim()
    : `simulator-${randomUUID()}`;
  const text = typeof payload?.text === "string" ? payload.text.trim() : "";

  if (
    !/^\d{10,15}$/.test(phone)
    || !/^\d{10,15}@(s\.whatsapp\.net|c\.us)$/.test(remoteJid)
    || !text
    || text.length > 4_000
    || messageId.length > 200
  ) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const summaryRequest = parseFinancialSummaryQuestion(text);
  if (!summaryRequest) {
    return NextResponse.json({ success: true, handled: false }, { status: 422 });
  }

  try {
    if (authorization.realWebhook) {
      const claim = await claimWhatsappInboundMessage(messageId, phone);
      if (claim.state === "COMPLETED") {
        return NextResponse.json({ success: true, handled: true, duplicate: true });
      }
      if (claim.state === "PROCESSING") {
        return NextResponse.json(
          { success: false, retryable: true, processing: true },
          { status: 503, headers: { "Retry-After": "30" } },
        );
      }
      claimedMessageId = messageId;
    }

    const user = await prisma.user.findFirst({
      where: { whatsappNumber: phone },
      include: { subscription: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, handled: false }, { status: 404 });
    }

    const subscriptionStatus = getUserSubscriptionStatus(user.createdAt, user.subscription);
    if (!hasProAccess(subscriptionStatus) && user.role !== "ADMIN") {
      const replyMessage = "⚠️ Seu período de testes acabou! Acesse o painel para assinar o plano Pro e continuar usando o bot.";
      if (authorization.realWebhook) {
        await sendWhatsAppMessage(remoteJid, replyMessage);
        await completeWhatsappInboundMessage(messageId);
      }
      return NextResponse.json({ success: true, handled: true, replyMessage });
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        occurredAt: {
          gte: summaryRequest.start,
          lt: summaryRequest.end,
        },
      },
      select: {
        amount: true,
        kind: true,
        occurredAt: true,
        category: { select: { name: true } },
      },
      orderBy: { occurredAt: "asc" },
    });

    const replyMessage = buildFinancialSummaryReply(
      transactions,
      summaryRequest,
      text,
    );

    if (authorization.realWebhook) {
      await sendWhatsAppMessage(remoteJid, replyMessage);
      await completeWhatsappInboundMessage(messageId);
    }

    return NextResponse.json({
      success: true,
      handled: true,
      replyMessage,
      period: {
        start: summaryRequest.start.toISOString(),
        end: summaryRequest.end.toISOString(),
        label: summaryRequest.periodLabel,
      },
    });
  } catch (error) {
    if (authorization.realWebhook && claimedMessageId) {
      try {
        await failWhatsappInboundMessage(claimedMessageId, error);
      } catch (stateError) {
        console.error("[WhatsApp Summary] Falha ao registrar erro:", stateError);
      }
    }

    console.error("[WhatsApp Summary] Erro:", error);
    return NextResponse.json(
      { success: false, retryable: true },
      { status: 503, headers: { "Retry-After": "30" } },
    );
  }
}
