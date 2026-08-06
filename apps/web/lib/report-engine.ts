import { addDays } from "date-fns";
import { getAccountLedgerSummaries } from "@/lib/account-ledger";
import { buildCashFlowForecast } from "@/lib/cash-flow-forecast";
import { prisma } from "@/lib/prisma";
import { saoPauloDayBounds } from "@/lib/reminders";
import type { ReportChartType, ReportPlan } from "@/lib/report-plan";

export type ReportKpi = {
  label: string;
  value: number;
  format: "CURRENCY" | "PERCENT" | "NUMBER";
};

export type ReportSeries = {
  name: string;
  values: number[];
  color?: string;
};

export type ProfessionalReport = {
  title: string;
  subtitle: string;
  chartType: ReportChartType;
  labels: string[];
  series: ReportSeries[];
  kpis: ReportKpi[];
  insights: string[];
  summary: string;
  emptyMessage?: string;
};

type TransactionRow = {
  amount: unknown;
  kind: "EXPENSE" | "INCOME";
  description: string | null;
  occurredAt: Date;
  category: { name: string } | null;
  financialAccount: { name: string } | null;
};

const currency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const percent = (value: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value) + "%";

function numeric(value: unknown) {
  return Number(value || 0);
}

function normalized(value?: string | null) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function periodBefore(plan: ReportPlan) {
  const start = plan.period.start;
  const end = plan.period.end;
  const startsOnFirstDay = start.getUTCDate() === 1;
  const endsOnFirstDay = end.getUTCDate() === 1;
  if (startsOnFirstDay && endsOnFirstDay) {
    const monthCount = Math.max(
      1,
      (end.getUTCFullYear() - start.getUTCFullYear()) * 12
        + end.getUTCMonth() - start.getUTCMonth(),
    );
    const previousStart = new Date(start);
    previousStart.setUTCMonth(previousStart.getUTCMonth() - monthCount);
    return { start: previousStart, end: new Date(start) };
  }
  const duration = plan.period.end.getTime() - plan.period.start.getTime();
  return {
    start: new Date(plan.period.start.getTime() - duration),
    end: new Date(plan.period.start),
  };
}

function dayLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(date).replace(" de ", "/").replace(".", "");
}

function weekLabel(date: Date) {
  const local = new Date(date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const weekday = (local.getDay() + 6) % 7;
  local.setDate(local.getDate() - weekday);
  return `Sem. ${String(local.getDate()).padStart(2, "0")}/${String(local.getMonth() + 1).padStart(2, "0")}`;
}

function groupLabel(transaction: TransactionRow, plan: ReportPlan) {
  if (plan.grouping === "DAY") return dayLabel(transaction.occurredAt);
  if (plan.grouping === "WEEK") return weekLabel(transaction.occurredAt);
  if (plan.grouping === "MONTH") return monthLabel(transaction.occurredAt);
  if (plan.grouping === "ACCOUNT") return transaction.financialAccount?.name || "Sem conta";
  if (plan.grouping === "DESCRIPTION") return transaction.description || "Sem descrição";
  return transaction.category?.name || "Sem categoria";
}

function filterTransactions(transactions: TransactionRow[], plan: ReportPlan) {
  const categoryHint = normalized(plan.categoryName);
  const accountHint = normalized(plan.accountName);
  return transactions.filter((transaction) => {
    const categoryName = normalized(transaction.category?.name);
    const accountName = normalized(transaction.financialAccount?.name);
    const categoryMatches = !categoryHint
      || (categoryName.length > 0 && (
        categoryName.includes(categoryHint) || categoryHint.includes(categoryName)
      ));
    const accountMatches = !accountHint
      || (accountName.length > 0 && (
        accountName.includes(accountHint) || accountHint.includes(accountName)
      ));
    return categoryMatches && accountMatches;
  });
}

function groupedValues(
  transactions: TransactionRow[],
  plan: ReportPlan,
  kind: "EXPENSE" | "INCOME",
) {
  const grouped = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.kind !== kind) continue;
    const label = groupLabel(transaction, plan);
    grouped.set(label, (grouped.get(label) || 0) + numeric(transaction.amount));
  }

  const entries = Array.from(grouped, ([label, value]) => ({ label, value }));
  const chronological = ["DAY", "WEEK", "MONTH"].includes(plan.grouping);
  if (!chronological) entries.sort((left, right) => right.value - left.value);
  return entries.slice(0, plan.topN);
}

function unionLabels(...groups: Array<Array<{ label: string; value: number }>>) {
  const labels: string[] = [];
  for (const group of groups) {
    for (const item of group) if (!labels.includes(item.label)) labels.push(item.label);
  }
  return labels;
}

function valuesFor(labels: string[], items: Array<{ label: string; value: number }>) {
  const map = new Map(items.map((item) => [item.label, item.value]));
  return labels.map((label) => map.get(label) || 0);
}

function topInsight(items: Array<{ label: string; value: number }>, noun: string) {
  const top = items[0];
  return top ? `${top.label} concentrou o maior ${noun}: ${currency(top.value)}.` : null;
}

function variationInsight(current: number, previous: number, noun: string) {
  if (previous <= 0) return null;
  const variation = ((current - previous) / previous) * 100;
  const direction = variation >= 0 ? "acima" : "abaixo";
  return `${noun} ficou ${percent(Math.abs(variation))} ${direction} do período anterior.`;
}

async function transactionReport(userId: string, plan: ReportPlan): Promise<ProfessionalReport> {
  const previous = periodBefore(plan);
  const [currentRows, previousRows] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        occurredAt: { gte: plan.period.start, lt: plan.period.end },
      },
      select: {
        amount: true,
        kind: true,
        description: true,
        occurredAt: true,
        category: { select: { name: true } },
        financialAccount: { select: { name: true } },
      },
      orderBy: { occurredAt: "asc" },
    }),
    plan.comparePreviousPeriod
      ? prisma.transaction.findMany({
          where: { userId, occurredAt: { gte: previous.start, lt: previous.end } },
          select: {
            amount: true,
            kind: true,
            description: true,
            occurredAt: true,
            category: { select: { name: true } },
            financialAccount: { select: { name: true } },
          },
          orderBy: { occurredAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const current = filterTransactions(currentRows, plan);
  const prior = filterTransactions(previousRows, plan);
  const income = current.filter((item) => item.kind === "INCOME").reduce((sum, item) => sum + numeric(item.amount), 0);
  const expense = current.filter((item) => item.kind === "EXPENSE").reduce((sum, item) => sum + numeric(item.amount), 0);
  const priorExpense = prior.filter((item) => item.kind === "EXPENSE").reduce((sum, item) => sum + numeric(item.amount), 0);
  const priorIncome = prior.filter((item) => item.kind === "INCOME").reduce((sum, item) => sum + numeric(item.amount), 0);
  const expenseItems = groupedValues(current, plan, "EXPENSE");
  const incomeItems = groupedValues(current, plan, "INCOME");
  const priorExpenseItems = groupedValues(prior, plan, "EXPENSE");
  const priorIncomeItems = groupedValues(prior, plan, "INCOME");
  const comparison = plan.metric === "INCOME_VS_EXPENSE";
  const activeItems = plan.metric === "INCOME" ? incomeItems : expenseItems;
  const previousItems = plan.metric === "INCOME" ? priorIncomeItems : priorExpenseItems;
  const labels = comparison
    ? unionLabels(incomeItems, expenseItems)
    : plan.comparePreviousPeriod
      ? unionLabels(activeItems, previousItems)
      : activeItems.map((item) => item.label);
  const series: ReportSeries[] = comparison
    ? [
        { name: "Receitas", values: valuesFor(labels, incomeItems), color: "#35e6a1" },
        { name: "Despesas", values: valuesFor(labels, expenseItems), color: "#ff6b7a" },
      ]
    : plan.comparePreviousPeriod
      ? [
          { name: "Período atual", values: valuesFor(labels, activeItems), color: "#35e6a1" },
          { name: "Período anterior", values: valuesFor(labels, previousItems), color: "#7c83ff" },
        ]
      : [{
          name: plan.metric === "INCOME" ? "Receitas" : "Despesas",
          values: valuesFor(labels, activeItems),
          color: plan.metric === "INCOME" ? "#35e6a1" : "#ff6b7a",
        }];
  const currentMetric = plan.metric === "INCOME" ? income : expense;
  const previousMetric = plan.metric === "INCOME" ? priorIncome : priorExpense;
  const insights = [
    topInsight(activeItems, plan.metric === "INCOME" ? "volume de receitas" : "volume de gastos"),
    plan.comparePreviousPeriod
      ? variationInsight(currentMetric, previousMetric, plan.metric === "INCOME" ? "As receitas" : "Os gastos")
      : null,
    expense > income && comparison ? `As despesas superaram as receitas em ${currency(expense - income)}.` : null,
  ].filter((item): item is string => Boolean(item));
  const title = comparison
    ? "Receitas x despesas"
    : plan.metric === "INCOME" ? "Relatório de receitas" : "Relatório de despesas";
  const chartType = plan.chartType === "DONUT" && series.length > 1 ? "BAR" : plan.chartType;

  return {
    title,
    subtitle: plan.period.periodLabel,
    chartType,
    labels,
    series,
    kpis: [
      { label: "Receitas", value: income, format: "CURRENCY" },
      { label: "Despesas", value: expense, format: "CURRENCY" },
      { label: "Saldo", value: income - expense, format: "CURRENCY" },
    ],
    insights,
    summary: [
      `📊 ${title} — ${plan.period.periodLabel}`,
      `💰 Receitas: ${currency(income)}`,
      `💸 Despesas: ${currency(expense)}`,
      `📈 Saldo: ${currency(income - expense)}`,
      ...insights.slice(0, 2).map((item) => `• ${item}`),
    ].join("\n"),
    emptyMessage: current.length === 0
      ? `Não encontrei movimentações em ${plan.period.periodLabel}.`
      : undefined,
  };
}

async function budgetReport(userId: string, plan: ReportPlan): Promise<ProfessionalReport> {
  const [budgets, expenses] = await Promise.all([
    prisma.budget.findMany({
      where: { userId },
      include: { category: { select: { name: true } } },
      orderBy: { category: { name: "asc" } },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        kind: "EXPENSE",
        categoryId: { not: null },
        occurredAt: { gte: plan.period.start, lt: plan.period.end },
      },
      _sum: { amount: true },
    }),
  ]);
  const spentByCategory = new Map(expenses.map((item) => [item.categoryId, numeric(item._sum.amount)]));
  const allRows = budgets.map((budget) => ({
    label: budget.category.name,
    limit: numeric(budget.monthlyLimit),
    spent: spentByCategory.get(budget.categoryId) || 0,
  })).sort((left, right) => {
    const rightUsage = right.limit > 0 ? right.spent / right.limit : 0;
    const leftUsage = left.limit > 0 ? left.spent / left.limit : 0;
    return rightUsage - leftUsage;
  });
  const rows = allRows.slice(0, plan.topN);
  const labels = rows.map((item) => item.label);
  const totalLimit = allRows.reduce((sum, item) => sum + item.limit, 0);
  const totalSpent = allRows.reduce((sum, item) => sum + item.spent, 0);
  const exceeded = allRows.filter((item) => item.spent > item.limit);
  const usage = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
  const insights = [
    exceeded.length > 0
      ? `${exceeded.length} ${exceeded.length === 1 ? "categoria ultrapassou" : "categorias ultrapassaram"} o limite.`
      : "Nenhuma categoria ultrapassou o limite no período.",
    rows[0] ? `${rows[0].label} está em ${percent(rows[0].limit > 0 ? (rows[0].spent / rows[0].limit) * 100 : 0)} do orçamento.` : null,
  ].filter((item): item is string => Boolean(item));

  return {
    title: "Uso dos orçamentos",
    subtitle: plan.period.periodLabel,
    chartType: "BAR",
    labels,
    series: [
      { name: "Gasto", values: rows.map((item) => item.spent), color: "#ffbd59" },
      { name: "Limite", values: rows.map((item) => item.limit), color: "#35e6a1" },
    ],
    kpis: [
      { label: "Limite total", value: totalLimit, format: "CURRENCY" },
      { label: "Gasto", value: totalSpent, format: "CURRENCY" },
      { label: "Utilizado", value: usage, format: "PERCENT" },
    ],
    insights,
    summary: `📊 Orçamentos — ${plan.period.periodLabel}\nLimite: ${currency(totalLimit)}\nGasto: ${currency(totalSpent)} (${percent(usage)})\n${insights.map((item) => `• ${item}`).join("\n")}`,
    emptyMessage: rows.length === 0 ? "Você ainda não configurou orçamentos por categoria." : undefined,
  };
}

async function accountReport(userId: string, plan: ReportPlan): Promise<ProfessionalReport> {
  const [accounts, ledger] = await Promise.all([
    prisma.financialAccount.findMany({
      where: { userId, isArchived: false, type: { not: "CREDIT_CARD" } },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
    getAccountLedgerSummaries(userId, { before: plan.period.end }),
  ]);
  const allRows = accounts.map((account) => ({
    label: account.name,
    value: ledger.get(account.id)?.balance || 0,
  })).sort((left, right) => right.value - left.value);
  const rows = allRows.slice(0, plan.topN);
  const total = allRows.reduce((sum, item) => sum + item.value, 0);
  const insights = rows[0] ? [`${rows[0].label} possui o maior saldo: ${currency(rows[0].value)}.`] : [];

  return {
    title: "Saldos por conta",
    subtitle: `Posição até ${plan.period.periodLabel}`,
    chartType: "BAR",
    labels: rows.map((item) => item.label),
    series: [{ name: "Saldo", values: rows.map((item) => item.value), color: "#35e6a1" }],
    kpis: [
      { label: "Saldo total", value: total, format: "CURRENCY" },
      { label: "Contas", value: allRows.length, format: "NUMBER" },
      { label: "Maior saldo", value: rows[0]?.value || 0, format: "CURRENCY" },
    ],
    insights,
    summary: `🏦 Saldos por conta\nSaldo total: ${currency(total)}\n${rows.map((item) => `• ${item.label}: ${currency(item.value)}`).join("\n")}`,
    emptyMessage: rows.length === 0 ? "Você ainda não cadastrou contas financeiras." : undefined,
  };
}

async function cardReport(userId: string, plan: ReportPlan): Promise<ProfessionalReport> {
  const cards = await prisma.financialAccount.findMany({
    where: { userId, isArchived: false, type: "CREDIT_CARD" },
    select: { id: true, name: true, creditLimit: true },
    orderBy: { createdAt: "asc" },
  });
  const [spending, payments] = cards.length > 0 ? await Promise.all([
    prisma.transaction.groupBy({
      by: ["financialAccountId"],
      where: {
        userId,
        kind: "EXPENSE",
        financialAccountId: { in: cards.map((item) => item.id) },
        occurredAt: { gte: plan.period.start, lt: plan.period.end },
      },
      _sum: { amount: true },
    }),
    prisma.creditCardPayment.groupBy({
      by: ["creditCardId"],
      where: { userId, paidAt: { gte: plan.period.start, lt: plan.period.end } },
      _sum: { amount: true },
    }),
  ]) : [[], []];
  const spentMap = new Map(spending.map((item) => [item.financialAccountId, numeric(item._sum.amount)]));
  const paidMap = new Map(payments.map((item) => [item.creditCardId, numeric(item._sum.amount)]));
  const allRows = cards.map((card) => ({
    label: card.name,
    spent: spentMap.get(card.id) || 0,
    paid: paidMap.get(card.id) || 0,
    limit: numeric(card.creditLimit),
  })).sort((left, right) => right.spent - left.spent);
  const rows = allRows.slice(0, plan.topN);
  const totalSpent = allRows.reduce((sum, item) => sum + item.spent, 0);
  const totalPaid = allRows.reduce((sum, item) => sum + item.paid, 0);
  const insights = rows[0] ? [`${rows[0].label} concentrou ${currency(rows[0].spent)} em compras no período.`] : [];

  return {
    title: "Gastos por cartão",
    subtitle: plan.period.periodLabel,
    chartType: "BAR",
    labels: rows.map((item) => item.label),
    series: [
      { name: "Compras", values: rows.map((item) => item.spent), color: "#7c83ff" },
      { name: "Pagamentos", values: rows.map((item) => item.paid), color: "#35e6a1" },
    ],
    kpis: [
      { label: "Compras", value: totalSpent, format: "CURRENCY" },
      { label: "Pago", value: totalPaid, format: "CURRENCY" },
      { label: "Cartões", value: allRows.length, format: "NUMBER" },
    ],
    insights,
    summary: `💳 Cartões — ${plan.period.periodLabel}\nCompras: ${currency(totalSpent)}\nPagamentos: ${currency(totalPaid)}\n${rows.map((item) => `• ${item.label}: ${currency(item.spent)}`).join("\n")}`,
    emptyMessage: rows.length === 0 ? "Você ainda não cadastrou cartões de crédito." : undefined,
  };
}

async function goalReport(userId: string, plan: ReportPlan): Promise<ProfessionalReport> {
  const goals = await prisma.financialGoal.findMany({
    where: { userId },
    orderBy: [{ completedAt: "asc" }, { targetDate: "asc" }],
  });
  const allRows = goals.map((goal) => ({
    label: `${goal.icon} ${goal.name}`,
    saved: numeric(goal.savedAmount),
    target: numeric(goal.targetAmount),
  }));
  const rows = allRows.slice(0, plan.topN);
  const totalSaved = allRows.reduce((sum, item) => sum + item.saved, 0);
  const totalTarget = allRows.reduce((sum, item) => sum + item.target, 0);
  const progress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
  const closest = [...allRows].sort((left, right) => {
    const rightProgress = right.target > 0 ? right.saved / right.target : 0;
    const leftProgress = left.target > 0 ? left.saved / left.target : 0;
    return rightProgress - leftProgress;
  })[0];
  const insights = closest ? [
    `${closest.label} é a meta mais avançada, com ${percent(closest.target > 0 ? (closest.saved / closest.target) * 100 : 0)}.`,
  ] : [];

  return {
    title: "Progresso das metas",
    subtitle: "Objetivos financeiros",
    chartType: "BAR",
    labels: rows.map((item) => item.label),
    series: [
      { name: "Guardado", values: rows.map((item) => item.saved), color: "#35e6a1" },
      { name: "Falta", values: rows.map((item) => Math.max(0, item.target - item.saved)), color: "#26384d" },
    ],
    kpis: [
      { label: "Guardado", value: totalSaved, format: "CURRENCY" },
      { label: "Objetivo", value: totalTarget, format: "CURRENCY" },
      { label: "Progresso", value: progress, format: "PERCENT" },
    ],
    insights,
    summary: `🎯 Metas financeiras\nGuardado: ${currency(totalSaved)} de ${currency(totalTarget)} (${percent(progress)})\n${rows.map((item) => `• ${item.label}: ${percent(item.target > 0 ? (item.saved / item.target) * 100 : 0)}`).join("\n")}`,
    emptyMessage: rows.length === 0 ? "Você ainda não cadastrou metas financeiras." : undefined,
  };
}

function monthlyRecurringAmount(amount: number, interval: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY") {
  if (interval === "DAILY") return amount * 30.44;
  if (interval === "WEEKLY") return amount * 4.345;
  if (interval === "YEARLY") return amount / 12;
  return amount;
}

async function recurringReport(userId: string, plan: ReportPlan): Promise<ProfessionalReport> {
  const recurring = await prisma.recurringTransaction.findMany({
    where: { userId, OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
    select: { amount: true, kind: true, description: true, interval: true },
    orderBy: { amount: "desc" },
  });
  const allRows = recurring.map((item) => ({
    label: item.description || "Recorrência",
    kind: item.kind,
    value: monthlyRecurringAmount(numeric(item.amount), item.interval),
  })).sort((left, right) => right.value - left.value);
  const rows = allRows.slice(0, plan.topN);
  const expenses = rows.filter((item) => item.kind === "EXPENSE");
  const incomes = rows.filter((item) => item.kind === "INCOME");
  const labels = unionLabels(
    expenses.map((item) => ({ label: item.label, value: item.value })),
    incomes.map((item) => ({ label: item.label, value: item.value })),
  );
  const monthlyExpense = allRows.filter((item) => item.kind === "EXPENSE").reduce((sum, item) => sum + item.value, 0);
  const monthlyIncome = allRows.filter((item) => item.kind === "INCOME").reduce((sum, item) => sum + item.value, 0);
  const biggest = allRows.find((item) => item.kind === "EXPENSE");
  const insights = biggest ? [`${biggest.label} é a maior despesa recorrente estimada: ${currency(biggest.value)}/mês.`] : [];

  return {
    title: "Compromissos recorrentes",
    subtitle: "Equivalência mensal estimada",
    chartType: "BAR",
    labels,
    series: [
      { name: "Despesas", values: labels.map((label) => expenses.find((item) => item.label === label)?.value || 0), color: "#ff6b7a" },
      { name: "Receitas", values: labels.map((label) => incomes.find((item) => item.label === label)?.value || 0), color: "#35e6a1" },
    ],
    kpis: [
      { label: "Despesas/mês", value: monthlyExpense, format: "CURRENCY" },
      { label: "Receitas/mês", value: monthlyIncome, format: "CURRENCY" },
      { label: "Recorrências", value: allRows.length, format: "NUMBER" },
    ],
    insights,
    summary: `🔁 Recorrências mensais estimadas\nReceitas: ${currency(monthlyIncome)}\nDespesas: ${currency(monthlyExpense)}\n${insights.map((item) => `• ${item}`).join("\n")}`,
    emptyMessage: rows.length === 0 ? "Você ainda não cadastrou movimentações recorrentes." : undefined,
  };
}

async function reminderReport(userId: string, plan: ReportPlan): Promise<ProfessionalReport> {
  const allReminders = await prisma.billReminder.findMany({
    where: {
      userId,
      isPaid: false,
      dueDate: { gte: plan.period.start, lt: plan.period.end },
    },
    orderBy: { dueDate: "asc" },
  });
  const reminders = allReminders.slice(0, plan.topN);
  const total = allReminders.reduce((sum, item) => sum + numeric(item.amount), 0);
  const overdue = allReminders.filter((item) => item.dueDate < new Date()).length;
  const labels = reminders.map((item) => `${dayLabel(item.dueDate)} · ${item.description}`);
  const insights = overdue > 0 ? [`${overdue} ${overdue === 1 ? "conta está vencida" : "contas estão vencidas"}.`] : [];

  return {
    title: "Contas a pagar",
    subtitle: plan.period.periodLabel,
    chartType: "BAR",
    labels,
    series: [{ name: "Valor", values: reminders.map((item) => numeric(item.amount)), color: "#ffbd59" }],
    kpis: [
      { label: "Total pendente", value: total, format: "CURRENCY" },
      { label: "Contas", value: allReminders.length, format: "NUMBER" },
      { label: "Vencidas", value: overdue, format: "NUMBER" },
    ],
    insights,
    summary: `📅 Contas a pagar — ${plan.period.periodLabel}\nTotal: ${currency(total)}\n${reminders.map((item) => `• ${dayLabel(item.dueDate)} · ${item.description}: ${currency(numeric(item.amount))}`).join("\n")}`,
    emptyMessage: reminders.length === 0 ? `Não encontrei contas pendentes em ${plan.period.periodLabel}.` : undefined,
  };
}

async function cashFlowReport(userId: string): Promise<ProfessionalReport> {
  const { start: todayStart, end: todayEnd } = saoPauloDayBounds();
  const horizonEnd = addDays(todayEnd, 90);
  const [accounts, recurring, reminders, futureTransactions] = await Promise.all([
    prisma.financialAccount.findMany({
      where: { userId, isArchived: false, type: { not: "CREDIT_CARD" } },
      select: { id: true, initialBalance: true },
    }),
    prisma.recurringTransaction.findMany({
      where: { userId, nextDate: { lte: horizonEnd }, OR: [{ endDate: null }, { endDate: { gte: todayStart } }] },
      select: { amount: true, kind: true, description: true, interval: true, nextDate: true, endDate: true },
    }),
    prisma.billReminder.findMany({
      where: { userId, isPaid: false },
      select: { amount: true, description: true, dueDate: true, snoozedUntil: true },
    }),
    prisma.transaction.findMany({
      where: { userId, occurredAt: { gt: todayEnd, lte: horizonEnd } },
      select: { amount: true, kind: true, description: true, occurredAt: true },
    }),
  ]);
  const ids = accounts.map((item) => item.id);
  const past = await prisma.transaction.groupBy({
    by: ["kind"],
    where: {
      userId,
      occurredAt: { lte: todayEnd },
      ...(ids.length > 0 ? { financialAccountId: { in: ids } } : {}),
    },
    _sum: { amount: true },
  });
  const initial = accounts.reduce((sum, item) => sum + numeric(item.initialBalance), 0);
  const currentBalance = past.reduce(
    (sum, item) => sum + (item.kind === "INCOME" ? 1 : -1) * numeric(item._sum.amount),
    initial,
  );
  const forecast = buildCashFlowForecast({
    currentBalance,
    futureTransactions: futureTransactions.map((item) => ({ ...item, amount: numeric(item.amount) })),
    recurringTransactions: recurring.map((item) => ({ ...item, amount: numeric(item.amount) })),
    reminders: reminders.map((item) => ({ ...item, amount: numeric(item.amount) })),
  });
  const sampled = forecast.points.filter((_, index) => index % 7 === 0 || index === forecast.points.length - 1);
  const insights = [
    forecast.firstNegativeDate ? `O saldo pode ficar negativo em ${forecast.firstNegativeDate.split("-").reverse().join("/")}.` : "A projeção não indica saldo negativo nos próximos 90 dias.",
    `Menor saldo projetado: ${currency(forecast.lowestBalance)}.`,
  ];

  return {
    title: "Projeção de fluxo de caixa",
    subtitle: "Próximos 90 dias",
    chartType: "AREA",
    labels: sampled.map((item) => item.date.slice(5).split("-").reverse().join("/")),
    series: [{ name: "Saldo projetado", values: sampled.map((item) => item.balance), color: "#35e6a1" }],
    kpis: [
      { label: "Saldo atual", value: currentBalance, format: "CURRENCY" },
      { label: "Em 30 dias", value: forecast.projected30, format: "CURRENCY" },
      { label: "Em 90 dias", value: forecast.projected90, format: "CURRENCY" },
    ],
    insights,
    summary: `📈 Projeção de fluxo de caixa\nHoje: ${currency(currentBalance)}\n30 dias: ${currency(forecast.projected30)}\n60 dias: ${currency(forecast.projected60)}\n90 dias: ${currency(forecast.projected90)}\n• ${insights.join("\n• ")}`,
    emptyMessage: accounts.length === 0 && futureTransactions.length === 0 && recurring.length === 0
      ? "Cadastre uma conta ou movimentações futuras para gerar a projeção."
      : undefined,
  };
}

export async function buildProfessionalReport(userId: string, plan: ReportPlan) {
  if (plan.source === "BUDGETS") return budgetReport(userId, plan);
  if (plan.source === "ACCOUNTS") return accountReport(userId, plan);
  if (plan.source === "CARDS") return cardReport(userId, plan);
  if (plan.source === "GOALS") return goalReport(userId, plan);
  if (plan.source === "RECURRING") return recurringReport(userId, plan);
  if (plan.source === "REMINDERS") return reminderReport(userId, plan);
  if (plan.source === "CASH_FLOW") return cashFlowReport(userId);
  return transactionReport(userId, plan);
}
