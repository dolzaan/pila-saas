import { describe, expect, it } from "vitest";
import { isVerifiedGoogleProfile } from "@/lib/google-auth";

describe("isVerifiedGoogleProfile", () => {
  it("aceita um perfil Google com e-mail verificado", () => {
    expect(
      isVerifiedGoogleProfile({
        email: "usuario@gmail.com",
        email_verified: true,
      }),
    ).toBe(true);
  });

  it("rejeita um perfil com e-mail não verificado", () => {
    expect(
      isVerifiedGoogleProfile({
        email: "usuario@gmail.com",
        email_verified: false,
      }),
    ).toBe(false);
  });

  it("rejeita um perfil sem e-mail", () => {
    expect(isVerifiedGoogleProfile({ email_verified: true })).toBe(false);
  });
});
