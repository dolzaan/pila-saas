import { timingSafeEqual } from "node:crypto";
import { externalTimeoutSignal, isTimeoutError } from "@/lib/external-service";
import { createRequestId, logger } from "@/lib/logger";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_API_BASE = "https://api.telegram.org";
const TELEGRAM_TEXT_LIMIT = 4_000;
const TELEGRAM_CAPTION_LIMIT = 1_000;

type TelegramApiResponse = {
  ok?: boolean;
  description?: string;
};

function telegramEndpoint(method: string) {
  return `${TELEGRAM_API_BASE}/bot${TELEGRAM_BOT_TOKEN}/${method}`;
}

function splitTelegramText(text: string) {
  if (text.length <= TELEGRAM_TEXT_LIMIT) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > TELEGRAM_TEXT_LIMIT) {
    const candidate = remaining.slice(0, TELEGRAM_TEXT_LIMIT);
    const breakAt = Math.max(candidate.lastIndexOf("\n"), candidate.lastIndexOf(" "));
    const safeBreak = breakAt > TELEGRAM_TEXT_LIMIT * 0.6 ? breakAt : TELEGRAM_TEXT_LIMIT;
    chunks.push(remaining.slice(0, safeBreak).trim());
    remaining = remaining.slice(safeBreak).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

async function readTelegramResponse(response: Response): Promise<TelegramApiResponse> {
  try {
    return await response.json() as TelegramApiResponse;
  } catch {
    return { ok: false, description: `Resposta inválida do Telegram (HTTP ${response.status})` };
  }
}

async function sendTelegramJson(method: string, body: Record<string, unknown>) {
  const response = await fetch(telegramEndpoint(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: externalTimeoutSignal("TELEGRAM_TIMEOUT_MS", 15_000),
  });
  const payload = await readTelegramResponse(response);
  return {
    success: response.ok && payload.ok === true,
    error: payload.description || (!response.ok ? `Telegram respondeu HTTP ${response.status}` : undefined),
  };
}

export function telegramWebhookSecretMatches(provided: string | null) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET || "";
  if (!provided || !expected) return false;

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length
    && timingSafeEqual(providedBuffer, expectedBuffer);
}

export function getTelegramBotUsername() {
  return (process.env.TELEGRAM_BOT_USERNAME || "").replace(/^@/, "").trim();
}

export function isTelegramConfigured() {
  return Boolean(TELEGRAM_BOT_TOKEN && getTelegramBotUsername() && process.env.TELEGRAM_WEBHOOK_SECRET);
}

export async function sendTelegramMessage(chatId: string, text: string) {
  const requestId = createRequestId();
  if (!TELEGRAM_BOT_TOKEN || !chatId) {
    logger.error("telegram_message_not_configured", { requestId, hasChatId: Boolean(chatId) });
    return false;
  }

  try {
    for (const chunk of splitTelegramText(text)) {
      const result = await sendTelegramJson("sendMessage", {
        chat_id: chatId,
        text: chunk,
        link_preview_options: { is_disabled: true },
      });

      if (!result.success) {
        logger.error("telegram_message_failed", {
          requestId,
          chatId,
          reason: result.error,
        });
        return false;
      }
    }

    logger.info("telegram_message_sent", { requestId, chatId, messageLength: text.length });
    return true;
  } catch (error) {
    logger.error("telegram_message_exception", {
      requestId,
      chatId,
      timeout: isTimeoutError(error),
      error,
    });
    return false;
  }
}

export async function sendTelegramMedia(
  chatId: string,
  mediaUrlOrBase64: string,
  mediatype: "image" | "document" | "audio" | "video",
  caption?: string,
) {
  const requestId = createRequestId();
  if (!TELEGRAM_BOT_TOKEN || !chatId) return false;

  const methodByType = {
    image: "sendPhoto",
    document: "sendDocument",
    audio: "sendAudio",
    video: "sendVideo",
  } as const;
  const fieldByType = {
    image: "photo",
    document: "document",
    audio: "audio",
    video: "video",
  } as const;

  try {
    const dataUrlMatch = mediaUrlOrBase64.match(/^data:([^;]+);base64,([\s\S]+)$/);
    let response: Response;

    if (dataUrlMatch) {
      const mimeType = dataUrlMatch[1];
      const extension = mimeType.split("/")[1]?.split(";")[0] || "bin";
      const form = new FormData();
      form.set("chat_id", chatId);
      form.set("caption", (caption || "").slice(0, TELEGRAM_CAPTION_LIMIT));
      form.set(
        fieldByType[mediatype],
        new Blob([Buffer.from(dataUrlMatch[2], "base64")], { type: mimeType }),
        `relatorio-pila.${extension}`,
      );
      response = await fetch(telegramEndpoint(methodByType[mediatype]), {
        method: "POST",
        body: form,
        signal: externalTimeoutSignal("TELEGRAM_TIMEOUT_MS", 20_000),
      });
    } else {
      response = await fetch(telegramEndpoint(methodByType[mediatype]), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          [fieldByType[mediatype]]: mediaUrlOrBase64,
          caption: (caption || "").slice(0, TELEGRAM_CAPTION_LIMIT),
        }),
        signal: externalTimeoutSignal("TELEGRAM_TIMEOUT_MS", 20_000),
      });
    }

    const payload = await readTelegramResponse(response);
    if (!response.ok || payload.ok !== true) {
      logger.error("telegram_media_failed", {
        requestId,
        chatId,
        mediatype,
        reason: payload.description,
      });
      return false;
    }

    logger.info("telegram_media_sent", { requestId, chatId, mediatype });
    return true;
  } catch (error) {
    logger.error("telegram_media_exception", {
      requestId,
      chatId,
      mediatype,
      timeout: isTimeoutError(error),
      error,
    });
    return false;
  }
}
