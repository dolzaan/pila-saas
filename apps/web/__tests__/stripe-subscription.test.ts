import { describe, expect, it } from "vitest";
import { mapStripeSubscriptionStatus } from "../lib/stripe-subscription";

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
