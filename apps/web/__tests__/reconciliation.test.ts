import { describe, expect, it } from "vitest";
import {
  calculateReconciliationDifference,
  calculateStatementBalance,
  isReconciliationBalanced,
} from "@/lib/reconciliation";

describe("account reconciliation", () => {
  it("calcula saldo de conta com saldo inicial, entradas e saídas", () => {
    expect(
      calculateStatementBalance("CHECKING", 1_000, {
        income: 500,
        expense: 325.5,
      }),
    ).toBe(1_174.5);
  });

  it("calcula fatura de cartão como despesas menos pagamentos", () => {
    expect(
      calculateStatementBalance("CREDIT_CARD", 0, {
        income: 200,
        expense: 950,
      }),
    ).toBe(750);
  });

  it("arredonda a diferença para centavos", () => {
    expect(calculateReconciliationDifference(100.005, 100)).toBe(0.01);
    expect(calculateReconciliationDifference(100, 100.004)).toBe(0);
  });

  it("só considera conciliado quando a diferença é menor que um centavo", () => {
    expect(isReconciliationBalanced(0)).toBe(true);
    expect(isReconciliationBalanced(0.009)).toBe(true);
    expect(isReconciliationBalanced(0.01)).toBe(false);
  });
});
