import { createHmac } from "node:crypto";

const REDIS_REQUEST_TIMEOUT_MS = 3_000;
const KEY_PREFIX = "pila";
const INCREMENT_WITH_TTL_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return { current, ttl }
`;

export type RateLimitRule = {
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

type RedisPipelineItem = {
  result?: unknown;
  error?: string;
};

export class RateLimitUnavailableError extends Error {
  constructor(message = "O serviço de proteção contra abuso está indisponível.") {
    super(message);
    this.name = "RateLimitUnavailableError";
  }
}

function getRedisConfig() {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    "";

  if (!url || !token) {
    throw new RateLimitUnavailableError(
      "Redis persistente não configurado para rate limiting."
    );
  }

  return { url: url.replace(/\/$/, ""), token };
}

function getRateLimitSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new RateLimitUnavailableError(
      "AUTH_SECRET não configurado para anonimizar chaves de rate limiting."
    );
  }
  return secret;
}

function validateRule(rule: RateLimitRule) {
  if (
    !rule.key ||
    !Number.isSafeInteger(rule.limit) ||
    rule.limit <= 0 ||
    !Number.isSafeInteger(rule.windowMs) ||
    rule.windowMs <= 0
  ) {
    throw new Error("Regra de rate limiting inválida.");
  }
}

export function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export function privateRateLimitKey(namespace: string, identifier: string) {
  const digest = createHmac("sha256", getRateLimitSecret())
    .update(identifier.trim().toLowerCase())
    .digest("hex");

  return `${namespace}:${digest}`;
}

export function getSaoPauloDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function rateLimitHeaders(decision: RateLimitDecision) {
  return {
    "Retry-After": String(decision.retryAfterSeconds),
    "X-RateLimit-Limit": String(decision.limit),
    "X-RateLimit-Remaining": String(decision.remaining),
  };
}

export async function checkRateLimits(
  rules: RateLimitRule[]
): Promise<RateLimitDecision> {
  if (rules.length === 0) {
    return {
      allowed: true,
      limit: 0,
      remaining: 0,
      retryAfterSeconds: 0,
    };
  }

  rules.forEach(validateRule);
  const { url, token } = getRedisConfig();
  const commands = rules.map((rule) => [
    "EVAL",
    INCREMENT_WITH_TTL_SCRIPT,
    "1",
    `${KEY_PREFIX}:${rule.key}`,
    String(rule.windowMs),
  ]);

  let response: Response;
  try {
    response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      cache: "no-store",
      signal: AbortSignal.timeout(REDIS_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new RateLimitUnavailableError(
      error instanceof Error
        ? `Falha ao consultar o Redis: ${error.message}`
        : "Falha ao consultar o Redis."
    );
  }

  if (!response.ok) {
    throw new RateLimitUnavailableError(
      `Redis respondeu com HTTP ${response.status}.`
    );
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload) || payload.length !== rules.length) {
    throw new RateLimitUnavailableError("Resposta inválida do Redis.");
  }

  const decisions = payload.map((item, index): RateLimitDecision => {
    const pipelineItem = item as RedisPipelineItem;
    if (pipelineItem.error) {
      throw new RateLimitUnavailableError(
        `Redis recusou uma regra de rate limiting: ${pipelineItem.error}`
      );
    }

    if (
      !Array.isArray(pipelineItem.result) ||
      pipelineItem.result.length < 2
    ) {
      throw new RateLimitUnavailableError(
        "Contador de rate limiting inválido."
      );
    }

    const count = Number(pipelineItem.result[0]);
    const ttlMs = Number(pipelineItem.result[1]);
    if (!Number.isFinite(count) || !Number.isFinite(ttlMs)) {
      throw new RateLimitUnavailableError(
        "Contador de rate limiting não numérico."
      );
    }

    const rule = rules[index];
    return {
      allowed: count <= rule.limit,
      limit: rule.limit,
      remaining: Math.max(0, rule.limit - count),
      retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1_000)),
    };
  });

  return (
    decisions.find((decision) => !decision.allowed) ||
    decisions.reduce((mostRestrictive, decision) =>
      decision.remaining < mostRestrictive.remaining
        ? decision
        : mostRestrictive
    )
  );
}
