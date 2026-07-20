import { externalTimeoutSignal, isTimeoutError } from "@/lib/external-service";
import { createRequestId, logger } from "@/lib/logger";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "http://localhost:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";
const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || "FinZapBot";

export async function sendWhatsAppMessage(phone: string, text: string) {
  const requestId = createRequestId();

  if (!EVOLUTION_API_KEY || EVOLUTION_API_KEY === "COLOQUE_SUA_CHAVE_DA_EVOLUTION_API") {
    logger.warn("whatsapp_message_mocked", {
      requestId,
      phone,
      messageLength: text.length,
    });
    return true;
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
        number: phone,
        text,
        delay: 1200,
      }),
      signal: externalTimeoutSignal("EVOLUTION_TIMEOUT_MS", 15_000),
    });

    if (!response.ok) {
      logger.error("whatsapp_message_failed", {
        requestId,
        phone,
        status: response.status,
        latencyMs: Date.now() - startedAt,
      });
      return false;
    }

    logger.info("whatsapp_message_sent", {
      requestId,
      phone,
      latencyMs: Date.now() - startedAt,
    });
    return true;
  } catch (error) {
    logger.error("whatsapp_message_exception", {
      requestId,
      phone,
      latencyMs: Date.now() - startedAt,
      timeout: isTimeoutError(error),
      error,
    });
    return false;
  }
}

export async function sendWhatsAppMedia(
  phone: string,
  mediaUrlOrBase64: string,
  mediatype: "image" | "document" | "audio" | "video",
  caption?: string,
) {
  const requestId = createRequestId();

  if (!EVOLUTION_API_KEY || EVOLUTION_API_KEY === "COLOQUE_SUA_CHAVE_DA_EVOLUTION_API") {
    logger.warn("whatsapp_media_mocked", {
      requestId,
      phone,
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
        number: phone,
        mediatype,
        mimetype: mimeType,
        media,
        caption: caption || "",
        fileName: `relatorio-pila.${extension}`,
        delay: 1200,
      }),
      signal: externalTimeoutSignal("EVOLUTION_TIMEOUT_MS", 15_000),
    });

    if (!response.ok) {
      logger.error("whatsapp_media_failed", {
        requestId,
        phone,
        mediatype,
        status: response.status,
        latencyMs: Date.now() - startedAt,
      });
      return false;
    }

    logger.info("whatsapp_media_sent", {
      requestId,
      phone,
      mediatype,
      latencyMs: Date.now() - startedAt,
    });
    return true;
  } catch (error) {
    logger.error("whatsapp_media_exception", {
      requestId,
      phone,
      mediatype,
      latencyMs: Date.now() - startedAt,
      timeout: isTimeoutError(error),
      error,
    });
    return false;
  }
}
