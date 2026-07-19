import type { FinancialAccountType } from "@prisma/client";

type AccountTotals = {
  income: number;
  expense: number;
};

export function calculateStatementBalance(
  accountType: FinancialAccountType,
  initialBalance: number,
  totals: AccountTotals,
) {
  const value =
    accountType === "CREDIT_CARD"
      ? totals.expense - totals.income
      : initialBalance + totals.income - totals.expense;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateReconciliationDifference(
  statementBalance: number,
  systemBalance: number,
) {
  const statementCents = Math.round((statementBalance + Number.EPSILON) * 100);
  const systemCents = Math.round((systemBalance + Number.EPSILON) * 100);
  return (statementCents - systemCents) / 100;
}

export function isReconciliationBalanced(difference: number) {
  return Math.abs(difference) < 0.01;
}
