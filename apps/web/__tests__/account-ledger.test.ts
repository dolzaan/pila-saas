import { describe, expect, it } from "vitest";
import { calculateAccountLedgerSummaries } from "@/lib/account-ledger";

describe("calculateAccountLedgerSummaries", () => {
  it("desconta o pagamento da conta de origem e restaura o limite do cartão", () => {
    const summaries = calculateAccountLedgerSummaries({
      accounts: [
        {
          id: "checking",
          type: "CHECKING",
          initialBalance: 2_000,
          creditLimit: null,
        },
        {
          id: "card",
          type: "CREDIT_CARD",
          initialBalance: 0,
          creditLimit: 3_000,
        },
      ],
      transactionTotals: [
        {
          financialAccountId: "checking",
          kind: "INCOME",
          amount: 500,
        },
        {
          financialAccountId: "checking",
          kind: "EXPENSE",
          amount: 200,
        },
        {
          financialAccountId: "card",
          kind: "EXPENSE",
          amount: 900,
        },
      ],
      cardPayments: [
        {
          creditCardId: "card",
          sourceAccountId: "checking",
          amount: 600,
        },
      ],
    });

    expect(summaries.get("checking")).toMatchObject({
      balance: 1_700,
      cardPaymentsSent: 600,
    });
    expect(summaries.get("card")).toMatchObject({
      outstandingBalance: 300,
      availableLimit: 2_700,
      cardPaymentsReceived: 600,
    });
  });

  it("não altera a conta bancária quando o pagamento não possui conta de origem", () => {
    const summaries = calculateAccountLedgerSummaries({
      accounts: [
        {
          id: "checking",
          type: "CHECKING",
          initialBalance: 1_000,
          creditLimit: null,
        },
        {
          id: "card",
          type: "CREDIT_CARD",
          initialBalance: 0,
          creditLimit: 1_500,
        },
      ],
      transactionTotals: [
        {
          financialAccountId: "card",
          kind: "EXPENSE",
          amount: 500,
        },
      ],
      cardPayments: [
        {
          creditCardId: "card",
          sourceAccountId: null,
          amount: 200,
        },
      ],
    });

    expect(summaries.get("checking")?.balance).toBe(1_000);
    expect(summaries.get("card")?.outstandingBalance).toBe(300);
  });

  it("nunca apresenta dívida negativa no cartão", () => {
    const summaries = calculateAccountLedgerSummaries({
      accounts: [
        {
          id: "card",
          type: "CREDIT_CARD",
          initialBalance: 0,
          creditLimit: 2_000,
        },
      ],
      transactionTotals: [
        {
          financialAccountId: "card",
          kind: "EXPENSE",
          amount: 100,
        },
      ],
      cardPayments: [
        {
          creditCardId: "card",
          sourceAccountId: null,
          amount: 150,
        },
      ],
    });

    expect(summaries.get("card")).toMatchObject({
      outstandingBalance: 0,
      availableLimit: 2_000,
    });
  });

  it("preserva saldos comuns quando não existem pagamentos de cartão", () => {
    const summaries = calculateAccountLedgerSummaries({
      accounts: [
        {
          id: "cash",
          type: "CASH",
          initialBalance: 250,
          creditLimit: null,
        },
      ],
      transactionTotals: [
        {
          financialAccountId: "cash",
          kind: "INCOME",
          amount: 100,
        },
        {
          financialAccountId: "cash",
          kind: "EXPENSE",
          amount: 80,
        },
      ],
      cardPayments: [],
    });

    expect(summaries.get("cash")?.balance).toBe(270);
  });

  it("move saldo entre contas sem criar receita nem despesa", () => {
    const summaries = calculateAccountLedgerSummaries({
      accounts: [
        {
          id: "checking",
          type: "CHECKING",
          initialBalance: 1_000,
          creditLimit: null,
        },
        {
          id: "savings",
          type: "SAVINGS",
          initialBalance: 300,
          creditLimit: null,
        },
      ],
      transactionTotals: [],
      cardPayments: [],
      transfers: [
        {
          sourceAccountId: "checking",
          destinationAccountId: "savings",
          amount: 250,
        },
      ],
    });

    expect(summaries.get("checking")).toMatchObject({
      balance: 750,
      income: 0,
      expense: 0,
      transfersOut: 250,
    });
    expect(summaries.get("savings")).toMatchObject({
      balance: 550,
      income: 0,
      expense: 0,
      transfersIn: 250,
    });
  });

  it("mantém o patrimônio total depois da transferência", () => {
    const summaries = calculateAccountLedgerSummaries({
      accounts: [
        {
          id: "first",
          type: "CHECKING",
          initialBalance: 600,
          creditLimit: null,
        },
        {
          id: "second",
          type: "CASH",
          initialBalance: 400,
          creditLimit: null,
        },
      ],
      transactionTotals: [],
      cardPayments: [],
      transfers: [
        {
          sourceAccountId: "first",
          destinationAccountId: "second",
          amount: 175,
        },
      ],
    });

    const total = (summaries.get("first")?.balance || 0)
      + (summaries.get("second")?.balance || 0);
    expect(total).toBe(1_000);
  });
});
