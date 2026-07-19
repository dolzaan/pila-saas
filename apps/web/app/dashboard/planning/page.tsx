import { auth } from "@/lib/auth";
import {
  buildCashFlowForecast,
  forecastDaysFromToday,
  type ForecastEvent,
} from "@/lib/cash-flow-forecast";
import { prisma } from "@/lib/prisma";
import { saoPauloDayBounds } from "@/lib/reminders";
import { addDays } from "date-fns";
import {
  AlertTriangle,
  CalendarClock,
  ChartNoAxesCombined,
  Landmark,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CashFlowChart } from "@/components/planning/cash-flow-chart";
import { FinancialGoalCard } from "@/components/planning/financial-goal-card";
import { FinancialGoalForm } from "@/components/planning/financial-goal-form";

export const metadata: Metadata = {
  title: "Planejamento financeiro — Pila",
  description: "Projete seu saldo e acompanhe suas metas financeiras.",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDateKey = (value: string) =>
  new Date(`${value}T12:00:00.000Z`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

const EVENT_SOURCE_LABELS: Record<ForecastEvent["source"], string> = {
  TRANSACTION: "Lançamento",
  RECURRING: "Conta fixa",
  REMINDER: "Lembrete",
};

export default async function PlanningPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { start: todayStart, end: todayEnd } = saoPauloDayBounds();
  const horizonEnd = addDays(todayEnd, 90);

  const [cashAccounts, recurring, reminders, futureTransactions, goals] =
    await Promise.all([
      prisma.financialAccount.findMany({
        where: {
          userId: session.user.id,
          isArchived: false,
          type: { not: "CREDIT_CARD" },
        },
        select: { id: true, initialBalance: true },
      }),
      prisma.recurringTransaction.findMany({
        where: {
          userId: session.user.id,
          nextDate: { lte: horizonEnd },
          OR: [{ endDate: null }, { endDate: { gte: todayStart } }],
        },
        select: {
          amount: true,
          kind: true,
          description: true,
          interval: true,
          nextDate: true,
          endDate: true,
        },
      }),
      prisma.billReminder.findMany({
        where: { userId: session.user.id, isPaid: false },
        select: {
          amount: true,
          description: true,
          dueDate: true,
          snoozedUntil: true,
        },
      }),
      prisma.transaction.findMany({
        where: {
          userId: session.user.id,
          occurredAt: { gt: todayEnd, lte: horizonEnd },
        },
        select: {
          amount: true,
          kind: true,
          description: true,
          occurredAt: true,
        },
      }),
      prisma.financialGoal.findMany({
        where: { userId: session.user.id },
        orderBy: [{ completedAt: "asc" }, { targetDate: "asc" }, { createdAt: "desc" }],
      }),
    ]);

  const accountIds = cashAccounts.map((account) => account.id);
  const currentTotals = await prisma.transaction.groupBy({
    by: ["kind"],
    where: {
      userId: session.user.id,
      occurredAt: { lte: todayEnd },
      ...(accountIds.length > 0
        ? { financialAccountId: { in: accountIds } }
        : {}),
    },
    _sum: { amount: true },
  });
  const initialBalance = cashAccounts.reduce(
    (total, account) => total + account.initialBalance.toNumber(),
    0,
  );
  const currentBalance = currentTotals.reduce(
    (total, item) =>
      total +
      (item.kind === "INCOME" ? 1 : -1) * (item._sum.amount?.toNumber() || 0),
    initialBalance,
  );

  const forecast = buildCashFlowForecast({
    currentBalance,
    futureTransactions: futureTransactions.map((item) => ({
      ...item,
      amount: item.amount.toNumber(),
    })),
    recurringTransactions: recurring.map((item) => ({
      ...item,
      amount: item.amount.toNumber(),
    })),
    reminders: reminders.map((item) => ({
      ...item,
      amount: item.amount.toNumber(),
    })),
  });

  const serializedGoals = goals.map((goal) => ({
    id: goal.id,
    name: goal.name,
    icon: goal.icon,
    targetAmount: goal.targetAmount.toNumber(),
    savedAmount: goal.savedAmount.toNumber(),
    targetDate: goal.targetDate?.toISOString() || null,
    completedAt: goal.completedAt?.toISOString() || null,
  }));
  const upcomingEvents = forecast.events.slice(0, 12);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header flex-col gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="dashboard-greeting">Planejamento financeiro</h1>
          <p className="dashboard-subtitle">
            Antecipe seu saldo e acompanhe os objetivos que importam para você.
          </p>
        </div>
        <FinancialGoalForm />
      </div>

      {cashAccounts.length === 0 && (
        <section className="section-card mb-6 border-amber-400/20 bg-amber-400/5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              <div>
                <h2 className="font-semibold text-gray-100">Projeção sem contas vinculadas</h2>
                <p className="mt-1 text-sm text-gray-400">
                  O saldo atual usa todo o seu histórico. Cadastre suas contas para uma base
                  mais precisa.
                </p>
              </div>
            </div>
            <Link href="/dashboard/accounts" className="app-button app-button--secondary">
              Cadastrar conta
            </Link>
          </div>
        </section>
      )}

      <div className="stats-grid">
        <div className="stat-card stat-card--balance">
          <div className="stat-card-header">
            <span className="stat-label">Saldo atual</span>
            <Landmark className="h-6 w-6 text-emerald-400" />
          </div>
          <div className="stat-value">{formatCurrency(currentBalance)}</div>
          <div className="stat-footer">Base da projeção</div>
        </div>
        <div className="stat-card stat-card--income">
          <div className="stat-card-header">
            <span className="stat-label">Em 30 dias</span>
            <TrendingUp className="h-6 w-6 text-emerald-400" />
          </div>
          <div
            className={`stat-value ${forecast.projected30 < 0 ? "text-red-300" : "text-emerald-300"}`}
          >
            {formatCurrency(forecast.projected30)}
          </div>
          <div className="stat-footer">Contas e compromissos previstos</div>
        </div>
        <div className="stat-card stat-card--transactions">
          <div className="stat-card-header">
            <span className="stat-label">Em 90 dias</span>
            <ChartNoAxesCombined className="h-6 w-6 text-indigo-400" />
          </div>
          <div
            className={`stat-value ${forecast.projected90 < 0 ? "text-red-300" : "text-white"}`}
          >
            {formatCurrency(forecast.projected90)}
          </div>
          <div className="stat-footer">Em 60 dias: {formatCurrency(forecast.projected60)}</div>
        </div>
        <div className="stat-card stat-card--expense">
          <div className="stat-card-header">
            <span className="stat-label">Menor saldo previsto</span>
            <TrendingDown className="h-6 w-6 text-red-400" />
          </div>
          <div
            className={`stat-value ${forecast.lowestBalance < 0 ? "text-red-300" : "text-white"}`}
          >
            {formatCurrency(forecast.lowestBalance)}
          </div>
          <div className="stat-footer">{formatDateKey(forecast.lowestBalanceDate)}</div>
        </div>
      </div>

      {forecast.firstNegativeDate && (
        <section className="section-card mb-6 border-red-400/20 bg-red-400/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
            <div>
              <h2 className="font-semibold text-red-200">Risco de saldo negativo</h2>
              <p className="mt-1 text-sm text-gray-400">
                Mantidas as entradas e saídas cadastradas, o saldo pode ficar negativo em{" "}
                {formatDateKey(forecast.firstNegativeDate)}.
              </p>
            </div>
          </div>
        </section>
      )}

      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <section className="section-card min-w-0" aria-labelledby="cash-flow-title">
          <div className="mb-5">
            <h2 id="cash-flow-title" className="text-lg font-semibold text-gray-100">
              Projeção de saldo
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Horizonte de 90 dias com lançamentos, recorrências e lembretes pendentes.
            </p>
          </div>
          <CashFlowChart data={forecast.points} />
        </section>

        <section className="section-card" aria-labelledby="upcoming-events-title">
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-indigo-300" />
            <h2 id="upcoming-events-title" className="text-lg font-semibold text-gray-100">
              Próximos movimentos
            </h2>
          </div>
          {upcomingEvents.length === 0 ? (
            <div className="empty-state min-h-64">
              <CalendarClock className="h-9 w-9 text-gray-600" />
              <p>Nada previsto nos próximos 90 dias.</p>
              <p className="empty-state-hint">
                Cadastre contas fixas ou lembretes para enriquecer a projeção.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {upcomingEvents.map((event, index) => (
                <div
                  key={`${event.source}-${event.date}-${event.description}-${index}`}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-200">
                      {event.description}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-600">
                      {EVENT_SOURCE_LABELS[event.source]} ·{" "}
                      {forecastDaysFromToday(event.date) === 0
                        ? "hoje"
                        : formatDateKey(event.date)}
                    </p>
                  </div>
                  <p
                    className={`shrink-0 text-sm font-semibold ${
                      event.kind === "INCOME" ? "text-emerald-300" : "text-red-300"
                    }`}
                  >
                    {event.kind === "INCOME" ? "+" : "-"}
                    {formatCurrency(event.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section aria-labelledby="goals-title">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-300" />
              <h2 id="goals-title" className="text-lg font-semibold text-gray-100">
                Minhas metas
              </h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Registre aportes e acompanhe o ritmo necessário até o prazo.
            </p>
          </div>
        </div>

        {serializedGoals.length === 0 ? (
          <div className="section-card empty-state">
            <Target className="mb-2 h-10 w-10 text-gray-600" />
            <p>Você ainda não criou nenhuma meta.</p>
            <p className="empty-state-hint">
              Comece por uma reserva de emergência ou por um objetivo de curto prazo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {serializedGoals.map((goal) => (
              <FinancialGoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
