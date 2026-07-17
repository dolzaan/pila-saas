import { describe, expect, it } from "vitest";
import {
  isCancellation,
  isConfirmation,
  parseOnboardingEmail,
  parseOnboardingName,
} from "@/lib/whatsapp-onboarding";

describe("WhatsApp onboarding", () => {
  it("extracts a natural name response", () => {
    expect(parseOnboardingName("Meu nome é Paulo Dolzan")).toMatchObject({ success: true, data: "Paulo Dolzan" });
    expect(parseOnboardingName("x").success).toBe(false);
  });

  it("extracts and normalizes email", () => {
    expect(parseOnboardingEmail("Meu email é PAULO@example.com")).toMatchObject({
      success: true,
      data: "paulo@example.com",
    });
    expect(parseOnboardingEmail("não tenho").success).toBe(false);
  });

  it("requires an unambiguous confirmation or cancellation", () => {
    expect(isConfirmation("sim")).toBe(true);
    expect(isConfirmation("talvez")).toBe(false);
    expect(isCancellation("cancelar")).toBe(true);
  });
});
