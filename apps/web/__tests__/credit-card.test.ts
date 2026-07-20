import { describe, expect, it } from "vitest";
import {
  buildAdvancedCardQueryReply,
  buildCardPaymentReply,
  buildInstallmentPlan,
  getOpenCardCycle,
  getPreviousCardCycle,
  parseCardPaymentCommand,
  splitInstallmentAmounts,
} from "@/lib/credit-card";
import type { FinancialAccountForAi } from "@/lib/financial-account-ai";

const nubank: FinancialAccountForAi = {
  id: "nubank",
  name: "Nubank",
  type: "CREDIT_CARD",
  creditLimit: 5_000,
  closingDay: 8,
  dueDay: 15,
};

describe("credit card cycles", () => {
  it("keeps a purchase before closing in the current cycle", () => {
    const cycle = getOpenCardCycle(new Date("2026-07-05T12:00:00Z"), 8, 15);
    expect(cycle.statementDate.toISOString().slice(0, 10)).toBe("2026-07-08");
    expect(cycle.dueDate.toISOString().slice(0, 10)).toBe("2026-07-15");
  });

  it("moves a purchase after closing to the next cycle", () => {
    const cycle = getOpenCardCycle(new Date("2026-07-09T12:00:00Z"), 8, 15);
    expect(cycle.statementDate.toISOString().slice(0, 10)).toBe("2026-08-08");
    expect(cycle.dueDate.toISOString().slice(0, 10)).toBe("2026-08-15");
  });

  it("moves due date to the next month when due day is before closing", () => {
    const cycle = getOpenCardCycle(new Date("2026-07-10T12:00:00Z"), 25, 5);
    expect(cycle.statementDate.toISOString().slice(0, 10)).toBe("2026-07-25");
    expect(cycle.dueDate.toISOString().slice(0, 10)).toBe("2026-08-05");
  });

  it("clamps closing and due dates to shorter months", () => {
    const cycle = getOpenCardCycle(new Date("2027-02-10T12:00:00Z"), 31, 31);
    expect(cycle.statementDate.toISOString().slice(0, 10)).toBe("2027-02-28");
    expect(cycle.dueDate.toISOString().slice(0, 10)).toBe("2027-03-31");
  });

  it("returns the immediately previous invoice cycle", () => {
    const current = getOpenCardCycle(new Date("2026-07-20T12:00:00Z"), 8, 15);
    const previous = getPreviousCardCycle(current, 8, 15);
    expect(current.statementDate.toISOString().slice(0, 10)).toBe("2026-08-08");
    expect(previous.statementDate.toISOString().slice(0, 10)).toBe("2026-07-08");
  });
});

describe("credit card installments", () => {
  it("splits cents without changing the original total", () => {
    const installments = splitInstallmentAmounts(100, 3);
    expect(installments).toEqual([33.34, 33.33, 33.33]);
    expect(Math.round(installments.reduce((sum, value) => sum + value, 0) * 100)).toBe(10_000);
  });

  it("creates one installment in each following invoice", () => {
    const plan = buildInstallmentPlan(
      1_200,
      3,
      new Date("2026-07-09T12:00:00Z"),
      8,
      15,
    );

    expect(plan.map((item) => item.statementDate.toISOString().slice(0, 10)))
      .toEqual(["2026-08-08", "2026-09-08", "2026-10-08"]);
    expect(plan.map((item) => item.dueDate.toISOString().slice(0, 10)))
      .toEqual(["2026-08-15", "2026-09-15", "2026-10-15"]);
    expect(plan.map((item) => item.amount)).toEqual([400, 400, 400]);
  });

  it("rejects unsafe installment counts", () => {
    expect(() => splitInstallmentAmounts(100, 0)).toThrow();
    expect(() => splitInstallmentAmounts(100, 49)).toThrow();
  });
});

describe("credit card payments and replies", () => {
  it("detects an invoice payment with Brazilian money format", () => {
    expect(parseCardPaymentCommand("Paguei a fatura do Nubank de R$ 1.234,56"))
      .toMatchObject({ matched: true, amount: 1234.56 });
  });

  it("does not confuse a normal card purchase with an invoice payment", () => {
    expect(parseCardPaymentCommand("Gastei 80 no cartão Nubank"))
      .toEqual({ matched: false });
  });

  it("builds a cycle-aware invoice reply", () => {
    const cycle = getOpenCardCycle(new Date("2026-07-20T12:00:00Z"), 8, 15);
    const reply = buildAdvancedCardQueryReply({
      query: "CURRENT_INVOICE",
      card: nubank,
      cycle,
      invoiceTotal: 900,
      invoicePaid: 400,
      outstandingBalance: 2_000,
    });
    expect(reply).toContain("08/08/2026");
    expect(reply).toContain("900");
    expect(reply).toContain("500");
  });

  it("calculates available limit from all outstanding purchases", () => {
    const reply = buildAdvancedCardQueryReply({
      query: "AVAILABLE_LIMIT",
      card: nubank,
      cycle: null,
      invoiceTotal: 0,
      invoicePaid: 0,
      outstandingBalance: 1_250,
    });
    expect(reply).toContain("3.750");
  });

  it("confirms partial and full payments", () => {
    const statementDate = new Date("2026-07-08T12:00:00Z");
    expect(buildCardPaymentReply({
      cardName: "Nubank",
      amount: 500,
      statementDate,
      remaining: 300,
    })).toContain("Ainda restam");
    expect(buildCardPaymentReply({
      cardName: "Nubank",
      amount: 800,
      statementDate,
      remaining: 0,
    })).toContain("quitada");
  });
});
