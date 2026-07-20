import {
  parseReportRequest,
  type ReportRequest,
} from "@/lib/report-query";

export type FinancialSummaryTransaction = {
  amount: unknown;
  kind: "EXPENSE" | "INCOME";
  occurredAt: Date;
  category?: { name: string } | null;
};

const VISUAL_REPORT_INTENT = /\b(grafico|relatorio|resumo visual|imagem|gastos por categoria)\b/;
const EXPENSE_TERMS = /\b(gastei|gastou|gastamos|gasto|gastos|despesa|despesas|saida|saidas)\b/;
const INCOME_TERMS = /\b(recebi|recebeu|recebemos|ganhei|ganhou|ganhamos|ganho|ganhos|receita|receitas|entrada|entradas)\b/;
const BALANCE_TERMS = /\b(saldo|balanco|diferenca entre ganhos e gastos|ganhos e gastos|gastos e ganhos)\b/;
const QUESTION_TERMS = /\b(quanto|qual|quais|total|soma|me diga|diga|mostre|mostrar|como esta|como estao|como ficou|como ficaram)\b/;
const PERSONAL_TOTAL_PREFIX = /^(?:meus|minhas)\s+(?:gastos|despesas|ganhos|receitas|entradas|saidas)\b/;

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9?]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function containsPhrase(text: string, phrase: string) {
  return ` ${text} `.includes(` ${phrase} `);
}

export function parseFinancialSummaryQuestion(
  text: string,
  now = new Date(),
): ReportRequest | null {
  const query = normalize(text);
  if (!query || VISUAL_REPORT_INTENT.test(query)) return null;

  const hasMetric = EXPENSE_TERMS.test(query)
    || INCOME_TERMS.test(query)
    || BALANCE_TERMS.test(query);
  if (!hasMetric) return null;

  const hasQuestionIntent = QUESTION_TERMS.test(query)
    || query.includes("?")
    || PERSONAL_TOTAL_PREFIX.test(query);
  if (!hasQuestionIntent) return null;

  return parseReportRequest(text, now);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function periodPrefix(periodLabel: string) {
  if (periodLabel === "hoje") return "Hoje";
  if (periodLabel === "ontem") return "Ontem";
  if (periodLabel === "esta semana") return "Nesta semana";
  if (periodLabel === "semana passada") return "Na semana passada";
  if (periodLabel.startsWith("ultimos ")) {
    return `Nos ${periodLabel.replace("ultimos", "últimos")}`;
  }
  return `Em ${periodLabel}`;
}

function pluralizeTransactions(count: number) {
  return count === 1 ? "1 lançamento" : `${count} lançamentos`;
}

function findCategoryFilter(
  transactions: FinancialSummaryTransaction[],
  text: string,
) {
  const query = normalize(text).replace(/\?/g, "");
  const categories = Array.from(new Set(
    transactions
      .map((transaction) => transaction.category?.name?.trim())
      .filter((name): name is string => Boolean(name)),
  )).sort((a, b) => b.length - a.length);

  return categories.find((category) => containsPhrase(query, normalize(category))) || null;
}

function categoryBreakdown(
  transactions: FinancialSummaryTransaction[],
  kind: "EXPENSE" | "INCOME",
) {
  const totals = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.kind !== kind) continue;
    const category = transaction.category?.name || "Sem categoria";
    totals.set(category, (totals.get(category) || 0) + Number(transaction.amount));
  }

  return Array.from(totals, ([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);
}

export function buildFinancialSummaryReply(
  transactions: FinancialSummaryTransaction[],
  request: ReportRequest,
  originalText: string,
) {
  const categoryFilter = findCategoryFilter(transactions, originalText);
  const filteredTransactions = categoryFilter
    ? transactions.filter((transaction) => transaction.category?.name === categoryFilter)
    : transactions;

  const expenses = filteredTransactions.filter((transaction) => transaction.kind === "EXPENSE");
  const incomes = filteredTransactions.filter((transaction) => transaction.kind === "INCOME");
  const expenseTotal = expenses.reduce(
    (sum, transaction) => sum + Number(transaction.amount),
    0,
  );
  const incomeTotal = incomes.reduce(
    (sum, transaction) => sum + Number(transaction.amount),
    0,
  );
  const prefix = periodPrefix(request.periodLabel);
  const categorySuffix = categoryFilter ? ` na categoria ${categoryFilter}` : "";

  if (request.metric === "COMPARISON") {
    const balance = incomeTotal - expenseTotal;
    return [
      `📊 ${prefix}${categorySuffix}:`,
      `💰 Ganhos: ${formatMoney(incomeTotal)}`,
      `💸 Gastos: ${formatMoney(expenseTotal)}`,
      `📈 Saldo do período: ${formatMoney(balance)}`,
    ].join("\n");
  }

  const kind = request.metric;
  const selected = kind === "INCOME" ? incomes : expenses;
  const total = kind === "INCOME" ? incomeTotal : expenseTotal;
  const noun = kind === "INCOME" ? "ganhos" : "gastos";

  if (selected.length === 0) {
    return `Não encontrei ${noun} registrados ${prefix.toLowerCase()}${categorySuffix}.`;
  }

  const action = kind === "INCOME" ? "você recebeu" : "você gastou";
  const lines = [
    `${kind === "INCOME" ? "💰" : "💸"} ${prefix} ${action} ${formatMoney(total)} em ${pluralizeTransactions(selected.length)}${categorySuffix}.`,
  ];

  if (!categoryFilter) {
    const breakdown = categoryBreakdown(filteredTransactions, kind);
    if (breakdown.length > 1) {
      lines.push(
        "",
        "Principais categorias:",
        ...breakdown.map((item) => `• ${item.category}: ${formatMoney(item.amount)}`),
      );
    }
  }

  return lines.join("\n");
}
