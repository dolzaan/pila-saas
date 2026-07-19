import { describe, expect, it } from "vitest";
import { matchTransactionRule, normalizeRuleText } from "@/lib/transaction-rules";

const rules = [
  {
    id: "generic",
    keyword: "uber",
    kind: "EXPENSE" as const,
    categoryId: "transport",
    financialAccountId: null,
    isActive: true,
    createdAt: "2026-07-19",
  },
  {
    id: "specific",
    keyword: "uber eats",
    kind: "EXPENSE" as const,
    categoryId: "food",
    financialAccountId: "credit-card",
    isActive: true,
    createdAt: "2026-07-20",
  },
];

describe("transaction rules", () => {
  it("normaliza acentos, espaços e caixa", () => {
    expect(normalizeRuleText("  SALÁRIO   Líquido ")).toBe("salario liquido");
  });

  it("prioriza a palavra-chave mais específica", () => {
    expect(
      matchTransactionRule(rules, {
        description: "UBER EATS * Pedido 123",
        kind: "EXPENSE",
      })?.id,
    ).toBe("specific");
  });

  it("respeita o tipo do lançamento", () => {
    expect(
      matchTransactionRule(rules, {
        description: "Repasse Uber",
        kind: "INCOME",
      }),
    ).toBeNull();
  });

  it("ignora regras pausadas", () => {
    expect(
      matchTransactionRule(
        [{ ...rules[0], isActive: false }],
        { description: "Uber viagem", kind: "EXPENSE" },
      ),
    ).toBeNull();
  });
});
