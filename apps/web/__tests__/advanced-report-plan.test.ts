import { describe, expect, it } from "vitest";
import { buildReportPlan } from "@/lib/report-plan";

const NOW = new Date("2026-08-05T15:00:00.000Z");

describe("advanced report planner", () => {
  it("planeja um donut de despesas por categoria", () => {
    const plan = buildReportPlan(
      "Faça um gráfico de pizza dos meus gastos por categoria deste mês",
      undefined,
      NOW,
    );

    expect(plan.source).toBe("TRANSACTIONS");
    expect(plan.metric).toBe("EXPENSE");
    expect(plan.grouping).toBe("CATEGORY");
    expect(plan.chartType).toBe("DONUT");
  });

  it.each([
    ["relatório dos meus orçamentos", "BUDGETS", "BUDGET_USAGE"],
    ["gráfico das faturas dos cartões", "CARDS", "CARD_SPENDING"],
    ["relatório do progresso das metas", "GOALS", "GOAL_PROGRESS"],
    ["relatório das contas recorrentes", "RECURRING", "RECURRING_FORECAST"],
    ["gráfico das contas a pagar", "REMINDERS", "UPCOMING_BILLS"],
    ["projeção do fluxo de caixa", "CASH_FLOW", "CASH_FLOW_FORECAST"],
  ])("identifica o domínio de %s", (message, source, metric) => {
    const plan = buildReportPlan(message, undefined, NOW);
    expect(plan.source).toBe(source);
    expect(plan.metric).toBe(metric);
  });

  it("entende uma janela dos últimos seis meses", () => {
    const plan = buildReportPlan(
      "Mostre a evolução das despesas nos últimos 6 meses",
      undefined,
      NOW,
    );

    expect(plan.grouping).toBe("MONTH");
    expect(plan.chartType).toBe("LINE");
    expect(plan.period.periodLabel).toBe("ultimos 6 meses");
    expect(plan.period.start.toISOString()).toBe("2026-03-01T03:00:00.000Z");
    expect(plan.period.end.toISOString()).toBe("2026-09-01T03:00:00.000Z");
  });

  it("não confunde mês passado com pedido de comparação", () => {
    const plan = buildReportPlan("relatório dos gastos do mês passado", undefined, NOW);
    expect(plan.comparePreviousPeriod).toBe(false);
  });

  it("aceita o plano estruturado da IA e preserva filtros", () => {
    const plan = buildReportPlan("faça aquele relatório", {
      source: "TRANSACTIONS",
      metric: "EXPENSE",
      grouping: "ACCOUNT",
      chartType: "BAR",
      comparePreviousPeriod: true,
      categoryName: "Alimentação",
      accountName: "Nubank",
      topN: 5,
    }, NOW);

    expect(plan.comparePreviousPeriod).toBe(true);
    expect(plan.categoryName).toBe("Alimentação");
    expect(plan.accountName).toBe("Nubank");
    expect(plan.topN).toBe(5);
  });
});
