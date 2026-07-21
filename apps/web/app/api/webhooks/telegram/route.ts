import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  runWithTelegramDelivery,
} from "@/lib/evolution";
import {
  sendTelegramMessage,
  telegramWebhookSecretMatches,
} from "@/lib/telegram";
import { POST as handleWhatsappWebhook } from "@/app/api/webhooks/whatsapp/route";

const TELEGRAM_PROVIDER = "telegram";
const TELEGRAM_LINK_PREFIX = "telegram-link:";
const MAX_TEXT_LENGTH = 4_000;

type TelegramMessage = {
  message_id: number;
  text?: string;
  chat: {
    id: number;
    type: string;
  };
  from?: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

function telegramMessageId(update: TelegramUpdate, message: TelegramMessage) {
  return `telegram:${update.update_id}:${message.message_id}`;
}

async function markMessageSourceAsTelegram(externalMessageId: string) {
  const firstTransaction = await prisma.transaction.findUnique({
    where: { externalMessageId },
    select: { installmentGroupId: true },
  });

  if (firstTransaction?.installmentGroupId) {
    await prisma.transaction.updateMany({
      where: { installmentGroupId: firstTransaction.installmentGroupId },
      data: { source: "telegram" },
    });
  } else {
    await prisma.transaction.updateMany({
      where: { externalMessageId },
      data: { source: "telegram" },
    });
  }

  await prisma.creditCardPayment.updateMany({
    where: { externalMessageId },
    data: { source: "telegram" },
  });
}

async function linkTelegramAccount(
  chatId: string,
  telegramUserId: string,
  username: string | undefined,
  token: string,
) {
  const linkToken = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (
    !linkToken
    || !linkToken.identifier.startsWith(TELEGRAM_LINK_PREFIX)
    || linkToken.expires <= new Date()
  ) {
    if (linkToken) {
      await prisma.verificationToken.deleteMany({ where: { token } });
    }
    return { success: false as const, error: "Esse link expirou. Gere um novo nas configurações do Pila." };
  }

  const userId = linkToken.identifier.slice(TELEGRAM_LINK_PREFIX.length);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, whatsappNumber: true },
  });

  if (!user?.whatsappNumber) {
    await prisma.verificationToken.deleteMany({ where: { token } });
    return {
      success: false as const,
      error: "Vincule seu WhatsApp no Pila antes de ativar o canal de contingência.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.account.deleteMany({
      where: {
        provider: TELEGRAM_PROVIDER,
        OR: [
          { userId },
          { providerAccountId: telegramUserId },
        ],
      },
    });
    await tx.account.create({
      data: {
        userId,
        type: "messaging",
        provider: TELEGRAM_PROVIDER,
        providerAccountId: telegramUserId,
        session_state: chatId,
        token_type: username ? `@${username}` : null,
      },
    });
    await tx.verificationToken.deleteMany({
      where: { identifier: linkToken.identifier },
    });
  });

  return { success: true as const };
}

export async function POST(req: Request) {
  if (!telegramWebhookSecretMatches(req.headers.get("x-telegram-bot-api-secret-token"))) {
    return NextResponse.json({ ok: false, error: "Não autorizado" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = await req.json() as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: false, error: "Payload inválido" }, { status: 400 });
  }

  const message = update.message;
  if (!message || message.chat.type !== "private" || !message.from) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const chatId = String(message.chat.id);
  const telegramUserId = String(message.from.id);
  const text = message.text?.trim() || "";

  if (!text) {
    await sendTelegramMessage(chatId, "Por enquanto, envie sua mensagem em texto para usar o Pila pelo Telegram.");
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (text.length > MAX_TEXT_LENGTH) {
    await sendTelegramMessage(chatId, "Essa mensagem ficou muito grande. Envie um texto com até 4.000 caracteres.");
    return NextResponse.json({ ok: true, ignored: true });
  }

  const startMatch = text.match(/^\/start(?:@\w+)?(?:\s+([A-Za-z0-9_-]{8,64}))?$/i);
  if (startMatch) {
    const token = startMatch[1];
    if (!token) {
      await sendTelegramMessage(
        chatId,
        "Para conectar sua conta, abra Configurações no Pila e toque em “Conectar Telegram”.",
      );
      return NextResponse.json({ ok: true });
    }

    const result = await linkTelegramAccount(
      chatId,
      telegramUserId,
      message.from.username,
      token,
    );
    await sendTelegramMessage(
      chatId,
      result.success
        ? "✅ Telegram conectado ao Pila! Você já pode registrar gastos, ganhos, lembretes e consultar suas finanças por aqui."
        : result.error,
    );
    return NextResponse.json({ ok: true, linked: result.success });
  }

  const telegramAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: TELEGRAM_PROVIDER,
        providerAccountId: telegramUserId,
      },
    },
    select: {
      user: {
        select: {
          whatsappNumber: true,
        },
      },
    },
  });

  const whatsappNumber = telegramAccount?.user.whatsappNumber;
  if (!whatsappNumber) {
    await sendTelegramMessage(
      chatId,
      "Este Telegram ainda não está conectado a uma conta do Pila. Entre no painel e acesse Configurações > Telegram.",
    );
    return NextResponse.json({ ok: true, unlinked: true });
  }

  const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Webhook Telegram] WHATSAPP_WEBHOOK_SECRET não configurado");
    return NextResponse.json({ ok: false, error: "Canal interno não configurado" }, { status: 503 });
  }

  const externalMessageId = telegramMessageId(update, message);
  const internalRequest = new Request(
    new URL(
      "/api/webhooks/whatsapp",
      process.env.APP_URL || process.env.AUTH_URL || "http://localhost:3000",
    ),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-pila-webhook-secret": webhookSecret,
      },
      body: JSON.stringify({
        event: "messages.upsert",
        data: {
          key: {
            remoteJid: `${whatsappNumber}@s.whatsapp.net`,
            fromMe: false,
            id: externalMessageId,
          },
          message: {
            conversation: text,
          },
        },
      }),
    },
  );

  const response = await runWithTelegramDelivery(chatId, () => handleWhatsappWebhook(internalRequest));
  if (response.ok) {
    await markMessageSourceAsTelegram(externalMessageId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { ok: false, retryable: response.status >= 500 },
    { status: response.status },
  );
}
