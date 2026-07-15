import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatDate,
  generateNumericCode,
  maskForLog,
} from "../lib/utils";

describe("formatCurrency", () => {
  it("formata valores em BRL corretamente", () => {
    // Intl.NumberFormat usa espaço non-breaking (\u00A0) entre "R$" e o número
    // em alguns sistemas — normalizamos para comparar apenas o conteúdo
    const normalize = (s: string) => s.replace(/\s/g, " ").trim();
    expect(normalize(formatCurrency(1234.5))).toBe("R$ 1.234,50");
    expect(normalize(formatCurrency(0))).toBe("R$ 0,00");
    expect(normalize(formatCurrency(100))).toBe("R$ 100,00");
    expect(normalize(formatCurrency("45.90"))).toBe("R$ 45,90");
  });

  it("formata valores negativos", () => {
    const normalize = (s: string) => s.replace(/\s/g, " ").trim();
    expect(normalize(formatCurrency(-100))).toBe("-R$ 100,00");
  });
});

describe("formatDate", () => {
  it("formata datas em pt-BR", () => {
    const date = new Date("2026-07-14T12:00:00Z");
    const formatted = formatDate(date);
    // Formato dd/mm/yyyy
    expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("aceita string de data", () => {
    const formatted = formatDate("2026-01-01T00:00:00Z");
    expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});

describe("generateNumericCode", () => {
  it("gera código com 6 dígitos por padrão", () => {
    const code = generateNumericCode();
    expect(code).toHaveLength(6);
    expect(/^\d{6}$/.test(code)).toBe(true);
  });

  it("gera código com número de dígitos especificado", () => {
    const code = generateNumericCode(4);
    expect(code).toHaveLength(4);
    expect(/^\d{4}$/.test(code)).toBe(true);
  });

  it("o código está dentro do range válido", () => {
    const code = parseInt(generateNumericCode(), 10);
    expect(code).toBeGreaterThanOrEqual(100000);
    expect(code).toBeLessThanOrEqual(999999);
  });

  it("gera códigos diferentes (probabilístico)", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateNumericCode()));
    // Com 20 gerações, é virtualmente impossível todos serem iguais
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe("maskForLog", () => {
  it("mascara strings longas", () => {
    expect(maskForLog("senha123")).toBe("se****23");
    expect(maskForLog("token-secreto")).toBe("to****to");
  });

  it("mascara strings curtas completamente", () => {
    expect(maskForLog("ab")).toBe("****");
    expect(maskForLog("abcd")).toBe("****");
  });

  it("retorna string vazia para input vazio", () => {
    expect(maskForLog("")).toBe("");
  });
});
