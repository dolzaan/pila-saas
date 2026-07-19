import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getRawMessageRetentionDays,
  rawMessageForStorage,
  redactSensitiveData,
  sanitizeTextForAi,
} from "@/lib/privacy";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("privacy helpers", () => {
  it("redacts direct identifiers and payment-card numbers", () => {
    const input = [
      "email paulo@example.com",
      "CPF 123.456.789-09",
      "CNPJ 12.345.678/0001-95",
      "telefone +55 (11) 99999-9999",
      "cartão 4111 1111 1111 1111",
      "chave 123e4567-e89b-12d3-a456-426614174000",
    ].join(" | ");

    const result = redactSensitiveData(input);

    expect(result).not.toContain("paulo@example.com");
    expect(result).not.toContain("123.456.789-09");
    expect(result).not.toContain("12.345.678/0001-95");
    expect(result).not.toContain("99999-9999");
    expect(result).not.toContain("4111 1111 1111 1111");
    expect(result).not.toContain("123e4567-e89b-12d3-a456-426614174000");
  });

  it("preserves financial values and dates needed by the model", () => {
    expect(sanitizeTextForAi("Gastei R$ 1.250,90 no dia 18/07/2026"))
      .toBe("Gastei R$ 1.250,90 no dia 18/07/2026");
  });

  it("does not retain raw messages unless explicitly enabled", () => {
    vi.stubEnv("STORE_RAW_MESSAGES", "");
    expect(rawMessageForStorage("Gastei R$ 20")).toBeNull();
  });

  it("redacts a retained message when storage is explicitly enabled", () => {
    vi.stubEnv("STORE_RAW_MESSAGES", "true");
    expect(rawMessageForStorage("Meu e-mail é paulo@example.com"))
      .toBe("Meu e-mail é [EMAIL_REMOVIDO]");
  });

  it("keeps retention between 30 and 90 days", () => {
    vi.stubEnv("RAW_MESSAGE_RETENTION_DAYS", "5");
    expect(getRawMessageRetentionDays()).toBe(30);

    vi.stubEnv("RAW_MESSAGE_RETENTION_DAYS", "120");
    expect(getRawMessageRetentionDays()).toBe(90);

    vi.stubEnv("RAW_MESSAGE_RETENTION_DAYS", "60");
    expect(getRawMessageRetentionDays()).toBe(60);
  });
});
