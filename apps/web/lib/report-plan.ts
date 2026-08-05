import { z } from "zod";
import { parseReportRequest, type ReportRequest } from "@/lib/report-query";

export const REPORT_SOURCES = [
  "TRANSACTIONS",
  "BUDGETS",
  "ACCOUNTS",
  "CARDS",
  "GOALS",
  "RECURRING",
  "REMINDERS",
  "CASH_FLOW",
] as const;

export const REPORT_METRICS = [
  "EXPENSE",
  "INCOME",
  "INCOME_VS_EXPENSE",
  "BUDGET_USAGE",
  "ACCOUNT_BALANCE",
  "CARD_SPENDING",
  "GOAL_PROGRESS",
  "RECURRING_FORECAST",
  "UPCOMING_BILLS",
  "CASH_FLOW_FORECAST",
] as const;

export const REPORT_GROUPINGS = [
  "CATEGORY",
  "DAY",
  "WEEK",
  "MONTH",
  "ACCOUNT",
  "DESCRIPTION",
] as const;

export const REPORT_CHART_TYPES = [
  "AUTO",
  "DONUT",
  "BAR",
  "LINE",
  "AREA",
  "STACKED_BAR",
] as const;

export const AiReportPlanSchema = z.object({
  source: z.enum(REPORT_SOURCES).optional(),
  metric: z.enum(REPORT_METRICS).optional(),
  grouping: z.enum(REPORT_GROUPINGS).optional(),
  chartType: z.enum(REPORT_CHART_TYPES).optional(),
  comparePreviousPeriod: z.boolean().optional(),
  categoryName: z.string().trim().max(80).optional(),
  accountName: z.string().trim().max(100).optional(),
  topN: z.number().int().min(3).max(15).optional(),
  includeInsights: z.boolean().optional(),
}).strict();

export type AiReportPlan = z.infer<typeof AiReportPlanSchema>;
export type ReportSource = typeof REPORT_SOURCES[number];
export type AdvancedReportMetric = typeof REPORT_METRICS[number];
export type AdvancedReportGrouping = typeof REPORT_GROUPINGS[number];
export type ReportChartType = Exclude<typeof REPORT_CHART_TYPES[number], "AUTO">;

export type ReportPlan = {
  source: ReportSource;
  metric: AdvancedReportMetric;
  grouping: AdvancedReportGrouping;
  chartType: ReportChartType;
  comparePreviousPeriod: boolean;
  categoryName?: string;
  accountName?: string;
  topN: number;
  includeInsights: boolean;
  period: ReportRequest;
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function inferSource(query: string): ReportSource {
  if (/\b(orcamentos?|limite por categoria|estour(?:ei|ou|ado))\b/.test(query)) return "BUDGETS";
  if (/\b(metas?|objetivos?|reserva|progresso da meta)\b/.test(query)) return "GOALS";
  if (/\b(recorrentes?|recorrencias?|contas? fixas?|assinaturas?|gastos? fixos?)\b/.test(query)) return "RECURRING";
  if (/\b(lembretes?|contas? a pagar|vencimentos?|proximas contas|contas pendentes)\b/.test(query)) return "REMINDERS";
  if (/\b(fluxo de caixa|projecao|saldo futuro|daqui a (?:30|60|90) dias)\b/.test(query)) return "CASH_FLOW";
  if (/\b(cartao|cartoes|fatura|credito)\b/.test(query)) return "CARDS";
  if (/\b(saldo por conta|saldos das contas|contas bancarias|minhas contas)\b/.test(query)) return "ACCOUNTS";
  return "TRANSACTIONS";
}

function metricForSource(source: ReportSource, period: ReportRequest): AdvancedReportMetric {
  if (source === "BUDGETS") return "BUDGET_USAGE";
  if (source === "ACCOUNTS") return "ACCOUNT_BALANCE";
  if (source === "CARDS") return "CARD_SPENDING";
  if (source === "GOALS") return "GOAL_PROGRESS";
  if (source === "RECURRING") return "RECURRING_FORECAST";
  if (source === "REMINDERS") return "UPCOMING_BILLS";
  if (source === "CASH_FLOW") return "CASH_FLOW_FORECAST";
  if (period.metric === "INCOME") return "INCOME";
  if (period.metric === "COMPARISON") return "INCOME_VS_EXPENSE";
  return "EXPENSE";
}

function inferGrouping(query: string, period: ReportRequest): AdvancedReportGrouping {
  if (/\bpor (?:conta|banco|carteira|cartao)\b/.test(query)) return "ACCOUNT";
  if (/\bpor (?:descricao|estabelecimento|loja)|maiores (?:compras|gastos)\b/.test(query)) return "DESCRIPTION";
  if (/\bpor semana|semanal|semana a semana\b/.test(query)) return "WEEK";
  if (/\bpor mes|mensal|mes a mes|evolucao\b/.test(query)) return "MONTH";
  if (/\bpor dia|diari[oa]|dia a dia\b/.test(query)) return "DAY";
  return period.grouping;
}

function explicitChartType(query: string) {
  if (/\b(pizza|rosca|donut|circular)\b/.test(query)) return "DONUT" as const;
  if (/\b(linha|evolucao|tendencia)\b/.test(query)) return "LINE" as const;
  if (/\barea\b/.test(query)) return "AREA" as const;
  if (/\b(empilhado|empilhada)\b/.test(query)) return "STACKED_BAR" as const;
  if (/\b(barra|barras|coluna|colunas)\b/.test(query)) return "BAR" as const;
  return null;
}

function defaultChartType(
  source: ReportSource,
  metric: AdvancedReportMetric,
  grouping: AdvancedReportGrouping,
): ReportChartType {
  if (source === "CASH_FLOW") return "AREA";
  if (source === "GOALS" || source === "BUDGETS") return "BAR";
  if (metric === "INCOME_VS_EXPENSE") return grouping === "MONTH" ? "STACKED_BAR" : "BAR";
  if (grouping === "DAY" || grouping === "WEEK" || grouping === "MONTH") return "LINE";
  if (grouping === "CATEGORY" && metric !== "CARD_SPENDING") return "DONUT";
  return "BAR";
}

export function buildReportPlan(
  text: string,
  aiPlan?: AiReportPlan,
  now = new Date(),
): ReportPlan {
  const query = normalize(text);
  const period = parseReportRequest(text, now);
  const source = aiPlan?.source || inferSource(query);
  const inferredMetric = metricForSource(source, period);
  const metric = source === "TRANSACTIONS"
    && aiPlan?.metric
    && ["EXPENSE", "INCOME", "INCOME_VS_EXPENSE"].includes(aiPlan.metric)
    ? aiPlan.metric
    : inferredMetric;
  const grouping = aiPlan?.grouping || inferGrouping(query, period);
  const requestedChart = aiPlan?.chartType === "AUTO" ? null : aiPlan?.chartType;
  const chartType = requestedChart
    || explicitChartType(query)
    || defaultChartType(source, metric, grouping);

  return {
    source,
    metric,
    grouping,
    chartType,
    comparePreviousPeriod: aiPlan?.comparePreviousPeriod
      ?? /\b(compar|versus|vs\.?|periodo anterior)\b/.test(query),
    categoryName: aiPlan?.categoryName,
    accountName: aiPlan?.accountName,
    topN: aiPlan?.topN || 8,
    includeInsights: aiPlan?.includeInsights ?? true,
    period,
  };
}
