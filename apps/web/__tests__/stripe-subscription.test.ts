import { describe, expect, it } from "vitest";
import {
  isStripeSubscriptionId,
  mapStripeSubscriptionStatus,
} from "../lib/stripe-subscription";

describe("mapStripeSubscriptionStatus", () => {
  it.each([
    ["active", "ACTIVE"],
    ["trialing", "TRIALING"],
    ["past_due", "PAST_DUE"],
    ["unpaid", "PAST_DUE"],
    ["canceled", "CANCELED"],
    ["incomplete_expired", "CANCELED"],
    ["incomplete", "INACTIVE"],
    ["paused", "INACTIVE"],
  ] as const)("converte %s para %s", (stripeStatus, localStatus) => {
    expect(mapStripeSubscriptionStatus(stripeStatus)).toBe(localStatus);
  });
});

describe("isStripeSubscriptionId", () => {
  it("aceita apenas IDs reais de assinatura da Stripe", () => {
    expect(isStripeSubscriptionId("sub_123")).toBe(true);
    expect(isStripeSubscriptionId("manual_123_user")).toBe(false);
    expect(isStripeSubscriptionId(null)).toBe(false);
  });
});
