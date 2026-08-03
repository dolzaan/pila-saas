import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";
import { sanitizeTextForAi } from "@/lib/privacy";

const CONVERSATION_TTL_MS = 6 * 60 * 60 * 1_000;
const MAX_EXCHANGES = 6;
const MAX_MESSAGE_LENGTH = 1_500;
const REDIS_REQUEST_TIMEOUT_MS = 3_000;
const KEY_PREFIX = "pila:conversation";

export type ConversationExchange = {
  user: string;
  assistant: string;
  createdAt: string;
};

type RedisPipelineItem = {
  result?: unknown;
  error?: string;
};

function getSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";
}

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";
  const secret = getSecret();

  if (!url || !token || !secret) return null;
  return { url: url.replace(/\/$/, ""), token, secret };
}

function conversationKey(userId: string, secret: string) {
  const digest = createHmac("sha256", secret)
    .update(userId)
    .digest("hex");
  return `${KEY_PREFIX}:${digest}`;
}

function encryptionKey(secret: string) {
  return createHash("sha256")
    .update(`pila-conversation-memory:${secret}`)
    .digest();
}

export function encryptConversationMemory(
  exchanges: ConversationExchange[],
  secret: string,
) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(exchanges), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptConversationMemory(value: string, secret: string) {
  const [version, encodedIv, encodedAuthTag, encodedPayload] = value.split(".");
  if (version !== "v1" || !encodedIv || !encodedAuthTag || !encodedPayload) {
    throw new Error("Memória de conversa inválida");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(secret),
    Buffer.from(encodedIv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(encodedAuthTag, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encodedPayload, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  const parsed: unknown = JSON.parse(decrypted);

  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is ConversationExchange => (
    typeof item === "object"
      && item !== null
      && typeof (item as ConversationExchange).user === "string"
      && typeof (item as ConversationExchange).assistant === "string"
      && typeof (item as ConversationExchange).createdAt === "string"
  )).slice(-MAX_EXCHANGES);
}

function sanitizeExchange(
  userMessage: string,
  assistantMessage: string,
): ConversationExchange | null {
  const user = sanitizeTextForAi(userMessage, MAX_MESSAGE_LENGTH);
  const assistant = sanitizeTextForAi(assistantMessage, MAX_MESSAGE_LENGTH);
  if (!user || !assistant) return null;

  return { user, assistant, createdAt: new Date().toISOString() };
}

async function redisPipeline(
  url: string,
  token: string,
  commands: unknown[][],
) {
  const response = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
    cache: "no-store",
    signal: AbortSignal.timeout(REDIS_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) throw new Error(`Redis respondeu com HTTP ${response.status}`);
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) throw new Error("Resposta inválida do Redis");
  return payload as RedisPipelineItem[];
}

export async function getConversationMemory(userId: string) {
  const config = getRedisConfig();
  if (!config) return [];

  try {
    const [item] = await redisPipeline(config.url, config.token, [
      ["GET", conversationKey(userId, config.secret)],
    ]);
    if (item?.error || typeof item?.result !== "string") return [];
    return decryptConversationMemory(item.result, config.secret);
  } catch (error) {
    console.warn(
      "[Conversation Memory] Não foi possível recuperar o contexto:",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}

export async function rememberConversationExchange(
  userId: string,
  previousExchanges: ConversationExchange[],
  userMessage: string,
  assistantMessage: string,
) {
  const config = getRedisConfig();
  const exchange = sanitizeExchange(userMessage, assistantMessage);
  if (!config || !exchange) return false;

  try {
    const exchanges = [...previousExchanges, exchange].slice(-MAX_EXCHANGES);
    const encrypted = encryptConversationMemory(exchanges, config.secret);
    const [item] = await redisPipeline(config.url, config.token, [
      [
        "SET",
        conversationKey(userId, config.secret),
        encrypted,
        "PX",
        String(CONVERSATION_TTL_MS),
      ],
    ]);
    return !item?.error && item?.result === "OK";
  } catch (error) {
    console.warn(
      "[Conversation Memory] Não foi possível salvar o contexto:",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

export function formatConversationMemory(exchanges: ConversationExchange[]) {
  if (exchanges.length === 0) return "Nenhuma conversa recente disponível.";

  return exchanges
    .slice(-MAX_EXCHANGES)
    .map((exchange) => `Usuário: ${exchange.user}\nPila: ${exchange.assistant}`)
    .join("\n\n");
}
