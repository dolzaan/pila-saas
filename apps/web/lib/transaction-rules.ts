import type { TransactionKind } from "@prisma/client";

export type MatchableTransactionRule = {
  id: string;
  keyword: string;
  kind: TransactionKind;
  categoryId: string;
  financialAccountId: string | null;
  isActive: boolean;
  createdAt?: Date | string;
};

export type TransactionRuleInput = {
  description?: string | null;
  kind: TransactionKind;
};

export function normalizeRuleText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

export function matchTransactionRule<Rule extends MatchableTransactionRule>(
  rules: Rule[],
  transaction: TransactionRuleInput,
): Rule | null {
  const description = normalizeRuleText(transaction.description || "");
  if (!description) return null;

  return (
    rules
      .filter((rule) => rule.isActive && rule.kind === transaction.kind)
      .sort((left, right) => {
        const byLength = normalizeRuleText(right.keyword).length -
          normalizeRuleText(left.keyword).length;
        if (byLength !== 0) return byLength;
        return String(left.createdAt || "").localeCompare(String(right.createdAt || ""));
      })
      .find((rule) => description.includes(normalizeRuleText(rule.keyword))) || null
  );
}
