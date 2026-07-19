import { describe, it, expect } from "vitest";
import {
  RegisterSchema,
  WhatsappLinkCodeSchema,
  TransactionSchema,
  FinancialAccountSchema,
  BillReminderSchema,
  FinancialGoalContributionSchema,
  FinancialGoalSchema,
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

  it("aceita categoria padrão com identificador do sistema", () => {
    const result = TransactionSchema.safeParse({
      amount: 300,
      kind: "EXPENSE",
      description: "Compras do mês",
      categoryId: "sys_exp_mercado",
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

describe("FinancialAccountSchema", () => {
  it("valida uma conta corrente", () => {
    expect(
      FinancialAccountSchema.safeParse({
        name: "Conta principal",
        type: "CHECKING",
        initialBalance: 1250.5,
      }).success,
    ).toBe(true);
  });

  it("valida um cartão com limite e datas", () => {
    expect(
      FinancialAccountSchema.safeParse({
        name: "Cartão Nubank",
        type: "CREDIT_CARD",
        initialBalance: 0,
        creditLimit: 5000,
        closingDay: 10,
        dueDay: 17,
      }).success,
    ).toBe(true);
  });

  it("rejeita cartão sem limite, fechamento ou vencimento", () => {
    const result = FinancialAccountSchema.safeParse({
      name: "Cartão incompleto",
      type: "CREDIT_CARD",
      initialBalance: 0,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(["creditLimit", "closingDay", "dueDay"]),
      );
    }
  });
});

describe("BillReminderSchema", () => {
  it("valida um lembrete financeiro", () => {
    expect(
      BillReminderSchema.safeParse({
        description: "Conta de internet",
        amount: 149.9,
        dueDate: "2026-07-25",
      }).success,
    ).toBe(true);
  });

  it("rejeita valor negativo e data fora do formato", () => {
    expect(
      BillReminderSchema.safeParse({
        description: "Conta",
        amount: -20,
        dueDate: "25/07/2026",
      }).success,
    ).toBe(false);
  });
});

describe("FinancialGoalSchema", () => {
  it("valida uma meta com valor inicial e prazo", () => {
    expect(
      FinancialGoalSchema.safeParse({
        name: "Reserva de emergência",
        icon: "🛟",
        targetAmount: 10_000,
        savedAmount: 2_500,
        targetDate: "2027-07-19",
      }).success,
    ).toBe(true);
  });

  it("rejeita valor guardado maior que o objetivo", () => {
    expect(
      FinancialGoalSchema.safeParse({
        name: "Viagem",
        icon: "✈️",
        targetAmount: 5_000,
        savedAmount: 6_000,
        targetDate: "",
      }).success,
    ).toBe(false);
  });

  it("valida apenas aportes e retiradas positivas", () => {
    expect(
      FinancialGoalContributionSchema.safeParse({
        amount: 250,
        operation: "DEPOSIT",
      }).success,
    ).toBe(true);
    expect(
      FinancialGoalContributionSchema.safeParse({
        amount: -10,
        operation: "WITHDRAW",
      }).success,
    ).toBe(false);
  });
});
