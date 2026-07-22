import { externalTimeoutSignal, isTimeoutError } from "@/lib/external-service";
import { createRequestId, logger } from "@/lib/logger";

const TELEGRAM_API_BASE = "https://api.telegram.org";
export const MAX_TELEGRAM_AUDIO_BYTES = 10 * 1024 * 1024;
export const MAX_TELEGRAM_IMAGE_BYTES = 8 * 1024 * 1024;

type TelegramFileResponse = {
  ok?: boolean;
  description?: string;
  result?: {
    file_path?: string;
    file_size?: number;
  };
};

export type TelegramPhotoSize = {
  file_id: string;
  file_size?: number;
  width?: number;
  height?: number;
};

type TelegramMediaDownloadResult =
  | {
      success: true;
      base64: string;
      mimeType: string;
    }
  | {
      success: false;
      reason: "NOT_CONFIGURED" | "TOO_LARGE" | "DOWNLOAD_FAILED" | "UNSUPPORTED_TYPE";
    };

function telegramFileEndpoint(token: string, filePath: string) {
  return `${TELEGRAM_API_BASE}/file/bot${token}/${filePath}`;
}

function mimeTypeFromFilePath(filePath: string, fallback: string) {
  const normalized = filePath.toLowerCase();
  if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) return "image/jpeg";
  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".webp")) return "image/webp";
  if (normalized.endsWith(".gif")) return "image/gif";
  if (normalized.endsWith(".ogg") || normalized.endsWith(".oga")) return "audio/ogg";
  if (normalized.endsWith(".mp3")) return "audio/mpeg";
  if (normalized.endsWith(".m4a")) return "audio/mp4";
  if (normalized.endsWith(".wav")) return "audio/wav";
  return fallback;
}

async function downloadTelegramFile(input: {
  fileId: string;
  declaredSize?: number;
  maxBytes: number;
  fallbackMimeType: string;
  expectedKind: "audio" | "image";
}): Promise<TelegramMediaDownloadResult> {
  const requestId = createRequestId();
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();

  if (!token) {
    logger.error(`telegram_${input.expectedKind}_not_configured`, { requestId });
    return { success: false, reason: "NOT_CONFIGURED" };
  }

  if (input.declaredSize && input.declaredSize > input.maxBytes) {
    logger.warn(`telegram_${input.expectedKind}_too_large`, {
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
      logger.error(`telegram_${input.expectedKind}_metadata_failed`, {
        requestId,
        status: metadataResponse.status,
        reason: metadata?.description,
      });
      return { success: false, reason: "DOWNLOAD_FAILED" };
    }

    if (fileSize && fileSize > input.maxBytes) {
      logger.warn(`telegram_${input.expectedKind}_too_large`, { requestId, declaredSize: fileSize });
      return { success: false, reason: "TOO_LARGE" };
    }

    const mimeType = mimeTypeFromFilePath(filePath, input.fallbackMimeType);
    if (
      (input.expectedKind === "audio" && !mimeType.startsWith("audio/"))
      || (input.expectedKind === "image" && !mimeType.startsWith("image/"))
    ) {
      logger.warn(`telegram_${input.expectedKind}_unsupported_type`, {
        requestId,
        mimeType,
      });
      return { success: false, reason: "UNSUPPORTED_TYPE" };
    }

    const fileResponse = await fetch(telegramFileEndpoint(token, filePath), {
      cache: "no-store",
      signal: externalTimeoutSignal("TELEGRAM_TIMEOUT_MS", 20_000),
    });

    if (!fileResponse.ok) {
      logger.error(`telegram_${input.expectedKind}_download_failed`, {
        requestId,
        status: fileResponse.status,
      });
      return { success: false, reason: "DOWNLOAD_FAILED" };
    }

    const contentLength = Number(fileResponse.headers.get("content-length") || 0);
    if (contentLength > input.maxBytes) {
      logger.warn(`telegram_${input.expectedKind}_too_large`, { requestId, declaredSize: contentLength });
      return { success: false, reason: "TOO_LARGE" };
    }

    const bytes = Buffer.from(await fileResponse.arrayBuffer());
    if (!bytes.length || bytes.length > input.maxBytes) {
      return {
        success: false,
        reason: bytes.length > input.maxBytes ? "TOO_LARGE" : "DOWNLOAD_FAILED",
      };
    }

    logger.info(`telegram_${input.expectedKind}_downloaded`, {
      requestId,
      sizeBytes: bytes.length,
      mimeType,
    });

    return {
      success: true,
      base64: bytes.toString("base64"),
      mimeType,
    };
  } catch (error) {
    logger.error(`telegram_${input.expectedKind}_download_exception`, {
      requestId,
      timeout: isTimeoutError(error),
      error,
    });
    return { success: false, reason: "DOWNLOAD_FAILED" };
  }
}

export function selectLargestTelegramPhoto(photos: TelegramPhotoSize[] | undefined) {
  if (!photos?.length) return null;

  return [...photos].sort((a, b) => {
    const areaA = (a.width || 0) * (a.height || 0);
    const areaB = (b.width || 0) * (b.height || 0);
    if (areaA !== areaB) return areaB - areaA;
    return (b.file_size || 0) - (a.file_size || 0);
  })[0] || null;
}

export async function downloadTelegramAudio(input: {
  fileId: string;
  mimeType?: string;
  declaredSize?: number;
}): Promise<TelegramMediaDownloadResult> {
  return downloadTelegramFile({
    fileId: input.fileId,
    declaredSize: input.declaredSize,
    maxBytes: MAX_TELEGRAM_AUDIO_BYTES,
    fallbackMimeType: input.mimeType || "audio/ogg",
    expectedKind: "audio",
  });
}

export async function downloadTelegramImage(input: {
  fileId: string;
  declaredSize?: number;
}): Promise<TelegramMediaDownloadResult> {
  return downloadTelegramFile({
    fileId: input.fileId,
    declaredSize: input.declaredSize,
    maxBytes: MAX_TELEGRAM_IMAGE_BYTES,
    fallbackMimeType: "image/jpeg",
    expectedKind: "image",
  });
}
