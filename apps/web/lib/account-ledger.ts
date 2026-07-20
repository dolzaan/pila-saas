import type { FinancialAccountType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type LedgerAccount = {
  id: string;
  type: FinancialAccountType;
  initialBalance: number;
  creditLimit: number | null;
};

export type LedgerTransactionTotal = {
  financialAccountId: string;
  kind: "EXPENSE" | "INCOME";
  amount: number;
};

export type LedgerCardPayment = {
  creditCardId: string;
  sourceAccountId: string | null;
  amount: number;
};

export type AccountLedgerSummary = {
  accountId: string;
  type: FinancialAccountType;
  income: number;
  expense: number;
  cardPaymentsReceived: number;
  cardPaymentsSent: number;
  balance: number;
  outstandingBalance: number;
  availableLimit: number | null;
};

export function calculateAccountLedgerSummaries(input: {
  accounts: LedgerAccount[];
  transactionTotals: LedgerTransactionTotal[];
  cardPayments: LedgerCardPayment[];
}) {
  const transactionByAccount = new Map<
    string,
    { income: number; expense: number }
  >();

  for (const total of input.transactionTotals) {
    const current = transactionByAccount.get(total.financialAccountId) || {
      income: 0,
      expense: 0,
    };
    current[total.kind === "INCOME" ? "income" : "expense"] += total.amount;
    transactionByAccount.set(total.financialAccountId, current);
  }

  const paymentsReceivedByCard = new Map<string, number>();
  const paymentsSentByAccount = new Map<string, number>();

  for (const payment of input.cardPayments) {
    paymentsReceivedByCard.set(
      payment.creditCardId,
      (paymentsReceivedByCard.get(payment.creditCardId) || 0) + payment.amount,
    );

    if (payment.sourceAccountId) {
      paymentsSentByAccount.set(
        payment.sourceAccountId,
        (paymentsSentByAccount.get(payment.sourceAccountId) || 0) + payment.amount,
      );
    }
  }

  return new Map<string, AccountLedgerSummary>(
    input.accounts.map((account) => {
      const totals = transactionByAccount.get(account.id) || {
        income: 0,
        expense: 0,
      };
      const cardPaymentsReceived = paymentsReceivedByCard.get(account.id) || 0;
      const cardPaymentsSent = paymentsSentByAccount.get(account.id) || 0;

      if (account.type === "CREDIT_CARD") {
        const outstandingBalance = Math.max(
          0,
          account.initialBalance + totals.expense - totals.income - cardPaymentsReceived,
        );
        const availableLimit = account.creditLimit === null
          ? null
          : account.creditLimit - outstandingBalance;

        return [
          account.id,
          {
            accountId: account.id,
            type: account.type,
            income: totals.income,
            expense: totals.expense,
            cardPaymentsReceived,
            cardPaymentsSent: 0,
            balance: outstandingBalance,
            outstandingBalance,
            availableLimit,
          },
        ];
      }

      const balance =
        account.initialBalance + totals.income - totals.expense - cardPaymentsSent;

      return [
        account.id,
        {
          accountId: account.id,
          type: account.type,
          income: totals.income,
          expense: totals.expense,
          cardPaymentsReceived: 0,
          cardPaymentsSent,
          balance,
          outstandingBalance: 0,
          availableLimit: null,
        },
      ];
    }),
  );
}

export async function getAccountLedgerSummaries(userId: string) {
  const [accounts, transactionTotals, cardPayments] = await Promise.all([
    prisma.financialAccount.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        initialBalance: true,
        creditLimit: true,
      },
    }),
    prisma.transaction.groupBy({
      by: ["financialAccountId", "kind"],
      where: {
        userId,
        financialAccountId: { not: null },
      },
      _sum: { amount: true },
    }),
    prisma.creditCardPayment.findMany({
      where: { userId },
      select: {
        creditCardId: true,
        sourceAccountId: true,
        amount: true,
      },
    }),
  ]);

  return calculateAccountLedgerSummaries({
    accounts: accounts.map((account) => ({
      id: account.id,
      type: account.type,
      initialBalance: account.initialBalance.toNumber(),
      creditLimit: account.creditLimit?.toNumber() ?? null,
    })),
    transactionTotals: transactionTotals.flatMap((total) =>
      total.financialAccountId
        ? [
            {
              financialAccountId: total.financialAccountId,
              kind: total.kind,
              amount: total._sum.amount?.toNumber() || 0,
            },
          ]
        : [],
    ),
    cardPayments: cardPayments.map((payment) => ({
      creditCardId: payment.creditCardId,
      sourceAccountId: payment.sourceAccountId,
      amount: payment.amount.toNumber(),
    })),
  });
}
