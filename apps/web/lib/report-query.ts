export type ReportMetric = "EXPENSE" | "INCOME" | "COMPARISON";
export type ReportGrouping = "CATEGORY" | "DAY" | "MONTH";

export type ReportRequest = {
  start: Date;
  end: Date;
  periodLabel: string;
  metric: ReportMetric;
  grouping: ReportGrouping;
};

type ReportTransaction = {
  amount: unknown;
  kind: "EXPENSE" | "INCOME";
  occurredAt: Date;
  category?: { name: string } | null;
};

const OFFSET_MS = 3 * 60 * 60 * 1000;
const MONTHS = [
  "janeiro", "fevereiro", "marco", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function saoPauloParts(date: Date) {
  const shifted = new Date(date.getTime() - OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
  };
}

function atSaoPauloMidnight(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day, 3));
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

function monthLabel(month: number, year: number) {
  return `${MONTHS[month]} de ${year}`;
}

export function parseReportRequest(text: string, now = new Date()): ReportRequest {
  const query = normalize(text);
  const today = saoPauloParts(now);
  let start = atSaoPauloMidnight(today.year, today.month, today.day);
  let end = addDays(start, 1);
  let periodLabel = "hoje";
  let grouping: ReportGrouping = "CATEGORY";

  const explicitYear = query.match(/\b(20\d{2})\b/)?.[1];
  const monthIndex = MONTHS.findIndex((month) => new RegExp(`\\b${month}\\b`).test(query));
  const lastDays = query.match(/ultim(?:o|os|a|as)\s+(\d{1,3})\s+dias?/);

  if (lastDays) {
    const days = Math.min(365, Math.max(1, Number(lastDays[1])));
    start = addDays(start, -(days - 1));
    periodLabel = `ultimos ${days} dias`;
    grouping = "DAY";
  } else if (/\bontem\b/.test(query)) {
    end = start;
    start = addDays(start, -1);
    periodLabel = "ontem";
  } else if (/\bsemana passada\b/.test(query)) {
    const daysSinceMonday = (today.weekday + 6) % 7;
    end = addDays(start, -daysSinceMonday);
    start = addDays(end, -7);
    periodLabel = "semana passada";
    grouping = "DAY";
  } else if (/\b(?:esta semana|semana atual)\b/.test(query)) {
    const daysSinceMonday = (today.weekday + 6) % 7;
    start = addDays(start, -daysSinceMonday);
    end = addDays(start, 7);
    periodLabel = "esta semana";
    grouping = "DAY";
  } else if (/\bmes passado\b/.test(query)) {
    const month = today.month === 0 ? 11 : today.month - 1;
    const year = today.month === 0 ? today.year - 1 : today.year;
    start = atSaoPauloMidnight(year, month, 1);
    end = atSaoPauloMidnight(today.year, today.month, 1);
    periodLabel = monthLabel(month, year);
  } else if (/\bano passado\b/.test(query)) {
    start = atSaoPauloMidnight(today.year - 1, 0, 1);
    end = atSaoPauloMidnight(today.year, 0, 1);
    periodLabel = String(today.year - 1);
    grouping = "MONTH";
  } else if (/\b(?:este ano|ano atual)\b/.test(query)) {
    start = atSaoPauloMidnight(today.year, 0, 1);
    end = atSaoPauloMidnight(today.year + 1, 0, 1);
    periodLabel = String(today.year);
    grouping = "MONTH";
  } else if (monthIndex >= 0) {
    const year = explicitYear ? Number(explicitYear) : today.year;
    start = atSaoPauloMidnight(year, monthIndex, 1);
    end = atSaoPauloMidnight(year + (monthIndex === 11 ? 1 : 0), (monthIndex + 1) % 12, 1);
    periodLabel = monthLabel(monthIndex, year);
  } else if (/\bhoje\b/.test(query)) {
    periodLabel = "hoje";
  } else {
    start = atSaoPauloMidnight(today.year, today.month, 1);
    end = atSaoPauloMidnight(
      today.year + (today.month === 11 ? 1 : 0),
      (today.month + 1) % 12,
      1,
    );
    periodLabel = monthLabel(today.month, today.year);
  }

  if (/\bpor (?:dia|data)|diari[oa]|evolucao diaria\b/.test(query)) grouping = "DAY";
  if (/\bpor mes|mensal|evolucao mensal\b/.test(query)) grouping = "MONTH";
  if (/\bpor categoria|categorias?|maiores gastos\b/.test(query)) grouping = "CATEGORY";

  const asksComparison = /\bcompar|\bsaldo\b|ganhos?.{0,20}gastos?|gastos?.{0,20}ganhos?/.test(query);
  const asksIncome = /\bganhos?|receitas?|entradas?|rendimentos?\b/.test(query);
  const metric: ReportMetric = asksComparison ? "COMPARISON" : asksIncome ? "INCOME" : "EXPENSE";

  if (metric === "COMPARISON") grouping = "CATEGORY";

  return { start, end, periodLabel, metric, grouping };
}

function dayKey(date: Date) {
  const parts = saoPauloParts(date);
  return `${String(parts.day).padStart(2, "0")}/${String(parts.month + 1).padStart(2, "0")}`;
}

function reportMonthKey(date: Date) {
  const parts = saoPauloParts(date);
  return `${MONTHS[parts.month].slice(0, 3).toUpperCase()}/${String(parts.year).slice(-2)}`;
}

export function buildReportData(transactions: ReportTransaction[], request: ReportRequest) {
  const income = transactions
    .filter((transaction) => transaction.kind === "INCOME")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const expense = transactions
    .filter((transaction) => transaction.kind === "EXPENSE")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  if (request.metric === "COMPARISON") {
    return {
      items: [
        { label: "Ganhos", value: income },
        { label: "Gastos", value: expense },
      ].filter((item) => item.value > 0),
      title: "GANHOS X GASTOS",
      totalLabel: "SALDO DO PERIODO",
      totalValue: income - expense,
      income,
      expense,
    };
  }

  const kind = request.metric;
  const grouped = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.kind !== kind) continue;
    const label = request.grouping === "DAY"
      ? dayKey(transaction.occurredAt)
      : request.grouping === "MONTH"
        ? reportMonthKey(transaction.occurredAt)
        : transaction.category?.name || "Sem categoria";
    grouped.set(label, (grouped.get(label) || 0) + Number(transaction.amount));
  }

  const noun = kind === "INCOME" ? "GANHOS" : "GASTOS";
  const suffix = request.grouping === "CATEGORY"
    ? "POR CATEGORIA"
    : request.grouping === "DAY"
      ? "POR DIA"
      : "POR MES";

  return {
    items: Array.from(grouped, ([label, value]) => ({ label, value })),
    title: `${noun} ${suffix}`,
    totalLabel: `TOTAL DE ${noun}`,
    totalValue: kind === "INCOME" ? income : expense,
    income,
    expense,
  };
}
