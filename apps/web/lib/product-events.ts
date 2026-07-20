import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const PRODUCT_EVENT_NAMES = [
  "landing_cta_clicked",
  "registration_started",
  "registration_completed",
  "onboarding_completed",
  "onboarding_skipped",
  "transaction_created",
  "first_transaction_created",
  "whatsapp_linked",
  "checkout_started",
  "subscription_activated",
  "support_requested",
] as const;

export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];
type ProductEventPropertyValue = string | number | boolean;

const PUBLIC_EVENT_NAMES = new Set<ProductEventName>([
  "landing_cta_clicked",
  "registration_started",
  "support_requested",
]);

export function isProductEventName(value: string): value is ProductEventName {
  return PRODUCT_EVENT_NAMES.includes(value as ProductEventName);
}

export function isPublicProductEventName(
  value: ProductEventName,
): boolean {
  return PUBLIC_EVENT_NAMES.has(value);
}

function sanitizeProperties(
  properties: Record<string, unknown> | undefined,
): Record<string, ProductEventPropertyValue> | null {
  if (!properties) return null;

  const safeEntries: Array<[string, ProductEventPropertyValue]> = [];

  for (const [key, value] of Object.entries(properties).slice(0, 10)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(key)) continue;

    if (typeof value === "boolean") {
      safeEntries.push([key, value]);
      continue;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      safeEntries.push([key, value]);
      continue;
    }

    if (typeof value === "string") {
      safeEntries.push([key, value.slice(0, 100)]);
    }
  }

  return safeEntries.length ? Object.fromEntries(safeEntries) : null;
}

export async function recordProductEvent(input: {
  eventName: ProductEventName;
  userId?: string | null;
  visitorId?: string | null;
  properties?: Record<string, unknown>;
}) {
  const properties = sanitizeProperties(input.properties);

  try {
    await prisma.$executeRaw`
      INSERT INTO "product_events" (
        "id",
        "eventName",
        "userId",
        "visitorId",
        "properties",
        "createdAt"
      )
      VALUES (
        ${randomUUID()},
        ${input.eventName},
        ${input.userId || null},
        ${input.visitorId || null},
        ${properties ? JSON.stringify(properties) : null}::jsonb,
        CURRENT_TIMESTAMP
      )
    `;
  } catch (error) {
    // Métricas são complementares e nunca podem bloquear o fluxo do usuário.
    console.error(
      "[recordProductEvent]",
      input.eventName,
      error instanceof Error ? error.message : "unknown",
    );
  }
}
