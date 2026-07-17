import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getUserSubscriptionStatus, hasProAccess } from "../lib/subscription";

describe("getUserSubscriptionStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-17T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("libera o Pila Pro durante os 7 dias de teste", () => {
    const result = getUserSubscriptionStatus(
      new Date("2026-07-17T11:00:00.000Z"),
      null
    );

    expect(result.status).toBe("TRIALING");
    expect(result.plan).toBe("pro");
    expect(result.daysLeft).toBe(7);
    expect(hasProAccess(result)).toBe(true);
  });

  it("exige pagamento quando os 7 dias terminam", () => {
    const result = getUserSubscriptionStatus(
      new Date("2026-07-10T12:00:00.000Z"),
      null
    );

    expect(result.status).toBe("EXPIRED");
    expect(result.daysLeft).toBe(0);
    expect(hasProAccess(result)).toBe(false);
  });

  it("mantém acesso para uma assinatura paga ativa", () => {
    const result = getUserSubscriptionStatus(
      new Date("2026-01-01T00:00:00.000Z"),
      {
        status: "ACTIVE",
        currentPeriodEnd: new Date("2026-08-17T12:00:00.000Z"),
        plan: "pro",
      }
    );

    expect(result.status).toBe("ACTIVE");
    expect(hasProAccess(result)).toBe(true);
  });
});
