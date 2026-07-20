import {
  DataEncryptionUnavailableError,
} from "@/lib/data-encryption";
import { externalTimeoutSignal, isTimeoutError } from "@/lib/external-service";
import { createRequestId, logger } from "@/lib/logger";
import { enqueueWhatsappTextMessage } from "@/lib/whatsapp-outbox";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "http://localhost:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";
const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || "FinZapBot";

type SendTextResult = {
  success: boolean;
  error?: string;
};

type EvolutionSendMetadata = {
  accepted: boolean;
  error?: string;
  messageId?: string;
  remoteJid?: string;
  status?: string;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numericValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function nestedRecord(record: UnknownRecord | null, key: string) {
  return record ? asRecord(record[key]) : null;
}

function nestedString(record: UnknownRecord | null, key: string) {
  return record ? stringValue(record[key]) : undefined;
}

function summarizeEvolutionError(payload: UnknownRecord | null) {
  if (!payload) return undefined;

  const directError = stringValue(payload.error);
  if (directError) return directError;

  const response = nestedRecord(payload, "response");
  const responseMessage = response?.message;
  if (typeof responseMessage === "string" && responseMessage.trim()) {
    return responseMessage.trim();
  }
  if (Array.isArray(responseMessage)) {
    const messages = responseMessage
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
    if (messages.length > 0) return messages.join("; ");
  }

  const message = stringValue(payload.message);
  return message;
}

function restoreBrazilianMobileNinthDigit(digits: string) {
  if (
    digits.length === 12
    && digits.startsWith("55")
    && /^[1-9]\d[6-9]\d{7}$/.test(digits.slice(2))
  ) {
    return `${digits.slice(0, 4)}9${digits.slice(4)}`;
  }

  return digits;
}

export function normalizeWhatsappRecipient(value: string) {
  const trimmed = value.trim();
  if (!trimmed || /@lid$/i.test(trimmed)) return null;

  const numberPart = trimmed.split("@")[0] || "";
  const digits = restoreBrazilianMobileNinthDigit(numberPart.replace(/\D/g, ""));
  return /^\d{10,15}$/.test(digits) ? digits : null;
}

export function inspectEvolutionSendPayload(payload: unknown): EvolutionSendMetadata {
  const root = asRecord(payload);
  if (!root) {
    return {
      accepted: false,
      error: "Evolution retornou uma resposta vazia ou inválida",
    };
  }

  const data = nestedRecord(root, "data");
  const rootKey = nestedRecord(root, "key");
  const dataKey = nestedRecord(data, "key");
  const message = nestedRecord(root, "message");
  const messageKey = nestedRecord(message, "key");
  const key = rootKey || dataKey || messageKey;

  const messageId = nestedString(key, "id");
  const remoteJid = nestedString(key, "remoteJid");
  const rawStatus = root.status ?? data?.status;
  const status = stringValue(rawStatus)?.toUpperCase();
  const numericStatus = numericValue(rawStatus);
  const explicitError = summarizeEvolutionError(root);
  const rejectedByStatus = numericStatus !== undefined
    ? numericStatus >= 400
    : status === "ERROR" || status === "FAILED" || status === "REJECTED";

  if (explicitError || rejectedByStatus) {
    return {
      accepted: false,
      error: explicitError || `Evolution retornou status ${status || numericStatus}`,
      messageId,
      remoteJid,
      status: status || (numericStatus !== undefined ? String(numericStatus) : undefined),
    };
  }

  if (!messageId) {
    return {
      accepted: false,
      error: "Evolution respondeu sem confirmar o ID da mensagem",
      remoteJid,
      status,
    };
  }

  return {
    accepted: true,
    messageId,
    remoteJid,
    status,
  };
}

async function readEvolutionPayload(response: Response) {
  const rawBody = await response.text();
  if (!rawBody.trim()) return null;

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return { message: rawBody.slice(0, 500) };
  }
}

export async function sendWhatsAppMessageDirect(
  phone: string,
  text: string,
): Promise<SendTextResult> {
  const requestId = createRequestId();
  const normalizedPhone = normalizeWhatsappRecipient(phone);

  if (!normalizedPhone) {
    const error = /@lid$/i.test(phone.trim())
      ? "Destinatário @lid sem remoteJidAlt; não foi possível obter o número real"
      : "Número de WhatsApp inválido para envio";
    logger.error("whatsapp_message_invalid_recipient", {
      requestId,
      phone,
      recipientKind: /@lid$/i.test(phone.trim()) ? "lid" : "invalid",
    });
    return { success: false, error };
  }

  if (!EVOLUTION_API_KEY || EVOLUTION_API_KEY === "COLOQUE_SUA_CHAVE_DA_EVOLUTION_API") {
    logger.warn("whatsapp_message_mocked", {
      requestId,
      phone: normalizedPhone,
      messageLength: text.length,
    });
    return { success: true };
  }

  const endpoint = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`;
  const startedAt = Date.now();

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: normalizedPhone,
        text,
        delay: 1200,
      }),
      signal: externalTimeoutSignal("EVOLUTION_TIMEOUT_MS", 15_000),
    });
    const payload = await readEvolutionPayload(response);
    const metadata = inspectEvolutionSendPayload(payload);

    if (!response.ok || !metadata.accepted) {
      const error = !response.ok
        ? `Evolution respondeu HTTP ${response.status}${metadata.error ? `: ${metadata.error}` : ""}`
        : metadata.error || "Evolution não confirmou o envio";
      logger.error("whatsapp_message_failed", {
        requestId,
        phone: normalizedPhone,
        statusCode: response.status,
        evolutionStatus: metadata.status,
        evolutionMessageId: metadata.messageId,
        remoteJidSuffix: metadata.remoteJid?.split("@")[1],
        reason: error,
        latencyMs: Date.now() - startedAt,
      });
      return { success: false, error };
    }

    logger.info("whatsapp_message_accepted", {
      requestId,
      phone: normalizedPhone,
      evolutionMessageId: metadata.messageId,
      evolutionStatus: metadata.status,
      remoteJidSuffix: metadata.remoteJid?.split("@")[1],
      latencyMs: Date.now() - startedAt,
    });
    return { success: true };
  } catch (error) {
    const message = isTimeoutError(error)
      ? "Tempo limite excedido ao enviar mensagem"
      : error instanceof Error
        ? error.message
        : "Falha desconhecida ao enviar mensagem";
    logger.error("whatsapp_message_exception", {
      requestId,
      phone: normalizedPhone,
      latencyMs: Date.now() - startedAt,
      timeout: isTimeoutError(error),
      error,
    });
    return { success: false, error: message };
  }
}

export async function sendWhatsAppMessage(phone: string, text: string) {
  const result = await sendWhatsAppMessageDirect(phone, text);
  if (result.success) return true;

  try {
    await enqueueWhatsappTextMessage({
      phone,
      text,
      error: result.error,
    });
    logger.warn("whatsapp_message_queued", {
      phone,
      reason: result.error,
    });
  } catch (error) {
    logger.error("whatsapp_message_queue_failed", {
      phone,
      encryptionUnavailable: error instanceof DataEncryptionUnavailableError,
      error,
    });
  }

  return false;
}

export async function sendWhatsAppMedia(
  phone: string,
  mediaUrlOrBase64: string,
  mediatype: "image" | "document" | "audio" | "video",
  caption?: string,
) {
  const requestId = createRequestId();
  const normalizedPhone = normalizeWhatsappRecipient(phone);

  if (!normalizedPhone) {
    logger.error("whatsapp_media_invalid_recipient", {
      requestId,
      phone,
      mediatype,
    });
    return false;
  }

  if (!EVOLUTION_API_KEY || EVOLUTION_API_KEY === "COLOQUE_SUA_CHAVE_DA_EVOLUTION_API") {
    logger.warn("whatsapp_media_mocked", {
      requestId,
      phone: normalizedPhone,
      mediatype,
    });
    return true;
  }

  const endpoint = `${EVOLUTION_API_URL}/message/sendMedia/${EVOLUTION_INSTANCE_NAME}`;
  const startedAt = Date.now();

  try {
    const dataUrlMatch = mediaUrlOrBase64.match(/^data:([^;]+);base64,([\s\S]+)$/);
    const mimeType = dataUrlMatch?.[1]
      || (mediatype === "image" ? "image/png" : "application/octet-stream");
    const media = dataUrlMatch?.[2] || mediaUrlOrBase64;
    const extension = mimeType.split("/")[1]?.split(";")[0] || "bin";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: normalizedPhone,
        mediatype,
        mimetype: mimeType,
        media,
        caption: caption || "",
        fileName: `relatorio-pila.${extension}`,
        delay: 1200,
      }),
      signal: externalTimeoutSignal("EVOLUTION_TIMEOUT_MS", 15_000),
    });
    const payload = await readEvolutionPayload(response);
    const metadata = inspectEvolutionSendPayload(payload);

    if (!response.ok || !metadata.accepted) {
      logger.error("whatsapp_media_failed", {
        requestId,
        phone: normalizedPhone,
        mediatype,
        statusCode: response.status,
        evolutionStatus: metadata.status,
        evolutionMessageId: metadata.messageId,
        reason: metadata.error,
        latencyMs: Date.now() - startedAt,
      });
      return false;
    }

    logger.info("whatsapp_media_accepted", {
      requestId,
      phone: normalizedPhone,
      mediatype,
      evolutionMessageId: metadata.messageId,
      evolutionStatus: metadata.status,
      latencyMs: Date.now() - startedAt,
    });
    return true;
  } catch (error) {
    logger.error("whatsapp_media_exception", {
      requestId,
      phone: normalizedPhone,
      mediatype,
      latencyMs: Date.now() - startedAt,
      timeout: isTimeoutError(error),
      error,
    });
    return false;
  }
}
