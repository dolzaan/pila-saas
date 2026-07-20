import { randomUUID } from "node:crypto";

export type LogLevel = "info" | "warn" | "error";
export type LogContext = Record<string, unknown>;

const SENSITIVE_KEY = /(password|secret|token|authorization|cookie|cvv|card|rawmessage|base64|email|phone)/i;
const MAX_STRING_LENGTH = 500;

function sanitizeValue(value: unknown, key = "", depth = 0): unknown {
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (depth > 3) return "[MAX_DEPTH]";

  if (typeof value === "string") {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}…`
      : value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message.slice(0, MAX_STRING_LENGTH),
    };
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item, key, depth + 1));
  }

  if (value && typeof value === "object") {
    return sanitizeContext(value as Record<string, unknown>, depth + 1);
  }

  return value;
}

function sanitizeContext(
  context: Record<string, unknown>,
  depth = 0,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(context)
      .slice(0, 30)
      .map(([key, value]) => [key, sanitizeValue(value, key, depth)]),
  );
}

function writeLog(level: LogLevel, event: string, context: LogContext = {}) {
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...sanitizeContext(context),
  });

  if (level === "error") {
    console.error(payload);
    return;
  }
  if (level === "warn") {
    console.warn(payload);
    return;
  }
  console.info(payload);
}

export function createRequestId() {
  return randomUUID();
}

export const logger = {
  info(event: string, context?: LogContext) {
    writeLog("info", event, context);
  },
  warn(event: string, context?: LogContext) {
    writeLog("warn", event, context);
  },
  error(event: string, context?: LogContext) {
    writeLog("error", event, context);
  },
};
