import { describe, expect, it } from "vitest";
import {
  buildAccountClarificationMessage,
  buildCardQueryReply,
  formatFinancialAccountsForAi,
  normalizeFinancialAccountName,
  resolveFinancialAccount,
  type FinancialAccountForAi,
} from "@/lib/financial-account-ai";

const accounts: FinancialAccountForAi[] = [
  {
    id: "card-nubank",
    name: "Nubank",
    type: "CREDIT_CARD",
    creditLimit: 5_000,
    closingDay: 8,
    dueDay: 15,
  },
  {
    id: "card-inter",
    name: "Inter Gold",
    type: "CREDIT_CARD",
    creditLimit: 3_000,
    closingDay: 10,
    dueDay: 18,
  },
  {
    id: "checking-inter",
    name: "Conta Inter",
    type: "CHECKING",
    creditLimit: null,
    closingDay: null,
    dueDay: null,
  },
];

describe("financial account AI helpers", () => {
  it("normalizes accents, punctuation and casing", () => {
    expect(normalizeFinancialAccountName("  Cartão CRÉDITO — Nubank! "))
      .toBe("cartao credito nubank");
  });

  it("matches a card by its exact name", () => {
    expect(resolveFinancialAccount("Nubank", accounts, { creditCardsOnly: true }))
      .toMatchObject({ status: "MATCHED", account: { id: "card-nubank" } });
  });

  it("matches a card when the user includes common card words", () => {
    expect(resolveFinancialAccount("no cartão Inter Gold", accounts, { creditCardsOnly: true }))
      .toMatchObject({ status: "MATCHED", account: { id: "card-inter" } });
  });

  it("recognizes common nicknames without storing card numbers", () => {
    expect(resolveFinancialAccount("roxinho", accounts, { creditCardsOnly: true }))
      .toMatchObject({ status: "MATCHED", account: { id: "card-nubank" } });
  });

  it("asks for clarification when the user says only cartão and has many cards", () => {
    const result = resolveFinancialAccount("cartão", accounts, { creditCardsOnly: true });
    expect(result.status).toBe("AMBIGUOUS");
    if (result.status === "AMBIGUOUS") {
      expect(buildAccountClarificationMessage(result.candidates))
        .toBe("Qual cartão você quis dizer: Nubank ou Inter Gold?");
    }
  });

  it("uses the only card automatically when there is no ambiguity", () => {
    const onlyNubank = accounts.filter((account) => account.id !== "card-inter");
    expect(resolveFinancialAccount(null, onlyNubank, { creditCardsOnly: true }))
      .toMatchObject({ status: "MATCHED", account: { id: "card-nubank" } });
  });

  it("does not confuse a checking account with a credit card", () => {
    expect(resolveFinancialAccount("Conta Inter", accounts, { creditCardsOnly: true }).status)
      .toBe("NOT_FOUND");
  });

  it("formats a privacy-safe card context for the model", () => {
    const context = formatFinancialAccountsForAi(
      accounts,
      new Map([
        ["card-nubank", 420.5],
        ["card-inter", 80],
      ]),
    );

    expect(context).toContain("Nome exato: Nubank");
    expect(context).toContain("Fechamento: dia 8");
    expect(context).toContain("Compras registradas neste mês: R$ 420,50");
    expect(context).not.toMatch(/\b\d{16}\b/);
  });

  it("builds deterministic replies for card queries", () => {
    const nubank = accounts[0];
    expect(buildCardQueryReply("CLOSING_DAY", nubank, 600))
      .toBe("A fatura do cartão Nubank fecha no dia 8.");
    expect(buildCardQueryReply("DUE_DAY", nubank, 600))
      .toBe("A fatura do cartão Nubank vence no dia 15.");
    expect(buildCardQueryReply("CURRENT_INVOICE", nubank, 600))
      .toContain("R$ 600,00");
    expect(buildCardQueryReply("AVAILABLE_LIMIT", nubank, 600))
      .toContain("R$ 4.400,00");
  });
});
