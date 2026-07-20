import { prisma } from "@/lib/prisma";
import { externalTimeoutSignal } from "@/lib/external-service";

export type ServiceHealthStatus =
  | "OPERATIONAL"
  | "DEGRADED"
  | "UNAVAILABLE"
  | "NOT_CONFIGURED";

export type ServiceHealthItem = {
  status: ServiceHealthStatus;
  latencyMs: number | null;
  message?: string;
};

export type ServiceHealthReport = {
  status: "OPERATIONAL" | "DEGRADED" | "UNAVAILABLE";
  checkedAt: string;
  services: {
    database: ServiceHealthItem;
    redis: ServiceHealthItem;
    whatsapp: ServiceHealthItem;
    gemini: ServiceHealthItem;
    stripe: ServiceHealthItem;
    email: ServiceHealthItem;
  };
};

async function timedCheck(action: () => Promise<void>) {
  const startedAt = Date.now();
  try {
    await action();
    return {
      status: "OPERATIONAL" as const,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      status: "UNAVAILABLE" as const,
      latencyMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : "Falha desconhecida",
    };
  }
}

async function checkDatabase(): Promise<ServiceHealthItem> {
  return timedCheck(async () => {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout ao consultar o banco")), 4_000),
      ),
    ]);
  });
}

async function checkRedis(): Promise<ServiceHealthItem> {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return {
      status: "NOT_CONFIGURED",
      latencyMs: null,
      message: "Redis persistente não configurado",
    };
  }

  return timedCheck(async () => {
    const response = await fetch(`${url.replace(/\/$/, "")}/ping`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
    });
    if (!response.ok) {
      throw new Error(`Redis respondeu HTTP ${response.status}`);
    }
  });
}

async function checkWhatsapp(): Promise<ServiceHealthItem> {
  const url = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instanceName = process.env.EVOLUTION_INSTANCE_NAME || "FinZapBot";

  if (!url || !apiKey) {
    return {
      status: "NOT_CONFIGURED",
      latencyMs: null,
      message: "Evolution API não configurada",
    };
  }

  const startedAt = Date.now();
  try {
    const response = await fetch(
      `${url.replace(/\/$/, "")}/instance/connectionState/${instanceName}`,
      {
        headers: { apikey: apiKey },
        cache: "no-store",
        signal: externalTimeoutSignal("EVOLUTION_TIMEOUT_MS", 15_000),
      },
    );
    if (!response.ok) {
      throw new Error(`Evolution respondeu HTTP ${response.status}`);
    }

    const data = await response.json() as { instance?: { state?: string } };
    const connected = data.instance?.state === "open";
    return {
      status: connected ? "OPERATIONAL" : "DEGRADED",
      latencyMs: Date.now() - startedAt,
      message: connected ? undefined : "Instância do WhatsApp desconectada",
    };
  } catch (error) {
    return {
      status: "UNAVAILABLE",
      latencyMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : "Falha desconhecida",
    };
  }
}

function configured(value: string | undefined, label: string): ServiceHealthItem {
  return value
    ? { status: "OPERATIONAL", latencyMs: null }
    : { status: "NOT_CONFIGURED", latencyMs: null, message: `${label} não configurado` };
}

export async function getServiceHealthReport(): Promise<ServiceHealthReport> {
  const [database, redis, whatsapp] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkWhatsapp(),
  ]);

  const services = {
    database,
    redis,
    whatsapp,
    gemini: configured(process.env.GEMINI_API_KEY, "Gemini"),
    stripe: configured(process.env.STRIPE_SECRET_KEY, "Stripe"),
    email: configured(process.env.EMAILJS_SERVICE_ID, "EmailJS"),
  };

  const criticalUnavailable = services.database.status === "UNAVAILABLE";
  const hasDegradedService = Object.values(services).some(
    (service) => service.status !== "OPERATIONAL",
  );

  return {
    status: criticalUnavailable
      ? "UNAVAILABLE"
      : hasDegradedService
        ? "DEGRADED"
        : "OPERATIONAL",
    checkedAt: new Date().toISOString(),
    services,
  };
}
