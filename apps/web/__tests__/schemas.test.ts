import { describe, it, expect } from "vitest";
import {
  RegisterSchema,
  WhatsappLinkCodeSchema,
  TransactionSchema,
} from "../lib/schemas";

describe("RegisterSchema", () => {
  it("valida dados corretos", () => {
    const result = RegisterSchema.safeParse({
      name: "Paulo Silva",
      email: "paulo@example.com",
      password: "senha1234",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita e-mail inválido", () => {
    const result = RegisterSchema.safeParse({
      name: "Paulo",
      email: "não-é-email",
      password: "senha1234",
    });
    expect(result.success).toBe(false);
    expect(result.error?.errors[0].path).toContain("email");
  });

  it("rejeita senha muito curta", () => {
    const result = RegisterSchema.safeParse({
      name: "Paulo",
      email: "paulo@example.com",
      password: "123",
    });
    expect(result.success).toBe(false);
    expect(result.error?.errors[0].path).toContain("password");
  });

  it("rejeita nome muito curto", () => {
    const result = RegisterSchema.safeParse({
      name: "P",
      email: "paulo@example.com",
      password: "senha1234",
    });
    expect(result.success).toBe(false);
    expect(result.error?.errors[0].path).toContain("name");
  });
});

describe("WhatsappLinkCodeSchema", () => {
  it("valida código de 6 dígitos", () => {
    expect(WhatsappLinkCodeSchema.safeParse({ code: "123456" }).success).toBe(true);
    expect(WhatsappLinkCodeSchema.safeParse({ code: "000000" }).success).toBe(true);
  });

  it("rejeita código com letras", () => {
    expect(WhatsappLinkCodeSchema.safeParse({ code: "12345a" }).success).toBe(false);
  });

  it("rejeita código com menos de 6 dígitos", () => {
    expect(WhatsappLinkCodeSchema.safeParse({ code: "12345" }).success).toBe(false);
  });

  it("rejeita código com mais de 6 dígitos", () => {
    expect(WhatsappLinkCodeSchema.safeParse({ code: "1234567" }).success).toBe(false);
  });
});

describe("TransactionSchema", () => {
  it("valida transação de despesa", () => {
    const result = TransactionSchema.safeParse({
      amount: 45.9,
      kind: "EXPENSE",
      description: "Mercado",
    });
    expect(result.success).toBe(true);
  });

  it("valida transação de receita", () => {
    const result = TransactionSchema.safeParse({
      amount: 3000,
      kind: "INCOME",
      description: "Salário",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita valor negativo", () => {
    const result = TransactionSchema.safeParse({
      amount: -100,
      kind: "EXPENSE",
    });
    expect(result.success).toBe(false);
    expect(result.error?.errors[0].path).toContain("amount");
  });

  it("rejeita kind inválido", () => {
    const result = TransactionSchema.safeParse({
      amount: 100,
      kind: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("aceita transação sem campos opcionais", () => {
    const result = TransactionSchema.safeParse({
      amount: 50,
      kind: "EXPENSE",
    });
    expect(result.success).toBe(true);
  });
});
