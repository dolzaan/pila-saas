import { describe, expect, it } from "vitest";
import { createActivationToken, hashActivationToken } from "@/lib/account-activation";

describe("Account activation", () => {
  it("creates an opaque token and stores only its hash", () => {
    const activation = createActivationToken();
    expect(activation.token).toHaveLength(64);
    expect(activation.tokenHash).toHaveLength(64);
    expect(activation.tokenHash).not.toBe(activation.token);
    expect(hashActivationToken(activation.token)).toBe(activation.tokenHash);
    expect(activation.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
