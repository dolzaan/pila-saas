import { describe, expect, it } from "vitest";
import {
  buildFinancialSummaryReply,
  parseFinancialSummaryQuestion,
} from "@/lib/financial-summary-query";
import { parseReportRequest } from "@/lib/report-query";

const NOW = new Date("2026-07-20T15:00:00.000Z");

const transactions = [
  {
    amount: 10,
    kind: "EXPENSE" as const,
    occurredAt: new Date("2026-07-20T14:00:00.000Z"),
    category: { name: "Mercado" },
  },
  {
    amount: 25,
    kind: "EXPENSE" as const,
    occurredAt: new Date("2026-07-20T16:00:00.000Z"),
    category: { name: "Transporte" },
  },
  {
    amount: 100,
    kind: "INCOME" as const,
    occurredAt: new Date("2026-07-20T13:00:00.000Z"),
    category: { name: "Freelance" },
  },
];

describe("financial summary query", () => {
  it("usa a mesma janela de hoje do relatório", () => {
    const summary = parseFinancialSummaryQuestion("quanto gastei hoje?", NOW);
    const report = parseReportRequest("relatório de gastos de hoje", NOW);

    expect(summary?.start.toISOString()).toBe(report.start.toISOString());
    expect(summary?.end.toISOString()).toBe(report.end.toISOString());
    expect(summary?.metric).toBe("EXPENSE");
  });

  it("não intercepta um pedido de relatório visual", () => {
    expect(parseFinancialSummaryQuestion("relatório de gastos de hoje", NOW)).toBeNull();
  });

  it("não confunde um novo lançamento com uma consulta", () => {
    expect(parseFinancialSummaryQuestion("gastei 10 reais hoje", NOW)).toBeNull();
  });

  it("responde o total de gastos usando os dados recebidos do banco", () => {
    const request = parseFinancialSummaryQuestion("quanto gastei hoje?", NOW);
    expect(request).not.toBeNull();

    const reply = buildFinancialSummaryReply(transactions, request!, "quanto gastei hoje?");
    expect(reply).toContain("35,00");
    expect(reply).toContain("2 lançamentos");
    expect(reply).toContain("Mercado");
    expect(reply).toContain("Transporte");
  });

  it("filtra por uma categoria mencionada", () => {
    const request = parseFinancialSummaryQuestion("quanto gastei no mercado hoje?", NOW);
    expect(request).not.toBeNull();

    const reply = buildFinancialSummaryReply(
      transactions,
      request!,
      "quanto gastei no mercado hoje?",
    );
    expect(reply).toContain("10,00");
    expect(reply).toContain("categoria Mercado");
    expect(reply).not.toContain("35,00");
  });

  it("responde saldo com ganhos e gastos do mesmo período", () => {
    const request = parseFinancialSummaryQuestion("qual meu saldo hoje?", NOW);
    expect(request).not.toBeNull();

    const reply = buildFinancialSummaryReply(transactions, request!, "qual meu saldo hoje?");
    expect(reply).toContain("Ganhos:");
    expect(reply).toContain("100,00");
    expect(reply).toContain("Gastos:");
    expect(reply).toContain("35,00");
    expect(reply).toContain("Saldo do período:");
    expect(reply).toContain("65,00");
  });

  it("informa quando não há gastos no período", () => {
    const request = parseFinancialSummaryQuestion("quanto gastei ontem?", NOW);
    expect(request).not.toBeNull();

    expect(buildFinancialSummaryReply([], request!, "quanto gastei ontem?"))
      .toBe("Não encontrei gastos registrados ontem.");
  });
});
