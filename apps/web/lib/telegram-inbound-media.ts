import { externalTimeoutSignal, isTimeoutError } from "@/lib/external-service";
import { createRequestId, logger } from "@/lib/logger";

const TELEGRAM_API_BASE = "https://api.telegram.org";
export const MAX_TELEGRAM_AUDIO_BYTES = 10 * 1024 * 1024;

type TelegramFileResponse = {
  ok?: boolean;
  description?: string;
  result?: {
    file_path?: string;
    file_size?: number;
  };
};

type TelegramAudioDownloadResult =
  | {
      success: true;
      base64: string;
      mimeType: string;
    }
  | {
      success: false;
      reason: "NOT_CONFIGURED" | "TOO_LARGE" | "DOWNLOAD_FAILED";
    };

function telegramFileEndpoint(token: string, filePath: string) {
  return `${TELEGRAM_API_BASE}/file/bot${token}/${filePath}`;
}

export async function downloadTelegramAudio(input: {
  fileId: string;
  mimeType?: string;
  declaredSize?: number;
}): Promise<TelegramAudioDownloadResult> {
  const requestId = createRequestId();
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();

  if (!token) {
    logger.error("telegram_audio_not_configured", { requestId });
    return { success: false, reason: "NOT_CONFIGURED" };
  }

  if (input.declaredSize && input.declaredSize > MAX_TELEGRAM_AUDIO_BYTES) {
    logger.warn("telegram_audio_too_large", {
      requestId,
      declaredSize: input.declaredSize,
    });
    return { success: false, reason: "TOO_LARGE" };
  }

  try {
    const metadataResponse = await fetch(
      `${TELEGRAM_API_BASE}/bot${token}/getFile?file_id=${encodeURIComponent(input.fileId)}`,
      {
        cache: "no-store",
        signal: externalTimeoutSignal("TELEGRAM_TIMEOUT_MS", 15_000),
      },
    );
    const metadata = await metadataResponse.json().catch(() => null) as TelegramFileResponse | null;
    const filePath = metadata?.result?.file_path;
    const fileSize = metadata?.result?.file_size || input.declaredSize;

    if (!metadataResponse.ok || metadata?.ok !== true || !filePath) {
      logger.error("telegram_audio_metadata_failed", {
        requestId,
        status: metadataResponse.status,
        reason: metadata?.description,
      });
      return { success: false, reason: "DOWNLOAD_FAILED" };
    }

    if (fileSize && fileSize > MAX_TELEGRAM_AUDIO_BYTES) {
      logger.warn("telegram_audio_too_large", { requestId, declaredSize: fileSize });
      return { success: false, reason: "TOO_LARGE" };
    }

    const fileResponse = await fetch(telegramFileEndpoint(token, filePath), {
      cache: "no-store",
      signal: externalTimeoutSignal("TELEGRAM_TIMEOUT_MS", 20_000),
    });

    if (!fileResponse.ok) {
      logger.error("telegram_audio_download_failed", {
        requestId,
        status: fileResponse.status,
      });
      return { success: false, reason: "DOWNLOAD_FAILED" };
    }

    const contentLength = Number(fileResponse.headers.get("content-length") || 0);
    if (contentLength > MAX_TELEGRAM_AUDIO_BYTES) {
      logger.warn("telegram_audio_too_large", { requestId, declaredSize: contentLength });
      return { success: false, reason: "TOO_LARGE" };
    }

    const bytes = Buffer.from(await fileResponse.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_TELEGRAM_AUDIO_BYTES) {
      return {
        success: false,
        reason: bytes.length > MAX_TELEGRAM_AUDIO_BYTES ? "TOO_LARGE" : "DOWNLOAD_FAILED",
      };
    }

    logger.info("telegram_audio_downloaded", {
      requestId,
      sizeBytes: bytes.length,
      mimeType: input.mimeType || "audio/ogg",
    });

    return {
      success: true,
      base64: bytes.toString("base64"),
      mimeType: input.mimeType || "audio/ogg",
    };
  } catch (error) {
    logger.error("telegram_audio_download_exception", {
      requestId,
      timeout: isTimeoutError(error),
      error,
    });
    return { success: false, reason: "DOWNLOAD_FAILED" };
  }
}
