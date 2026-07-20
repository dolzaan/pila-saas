import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Activity, CheckCircle2, MousePointerClick, ReceiptText, UserRoundCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Métricas de ativação — Pila",
};

type EventMetricRow = {
  eventName: string;
  total: number;
  users: number;
};

type DailyMetricRow = {
  day: Date;
  total: number;
};

const EVENT_LABELS: Record<string, string> = {
  landing_cta_clicked: "Cliques na landing",
  registration_started: "Cadastros iniciados",
  registration_completed: "Cadastros concluídos",
  onboarding_completed: "Guias concluídos",
  onboarding_skipped: "Guias pulados",
  transaction_created: "Transações criadas",
  first_transaction_created: "Primeiras transações",
  whatsapp_linked: "WhatsApps vinculados",
  checkout_started: "Checkouts iniciados",
  subscription_activated: "Assinaturas ativadas",
  support_requested: "Pedidos de suporte",
};

const formatNumber = new Intl.NumberFormat("pt-BR");

export default async function ProductMetricsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const [eventMetrics, dailyActivations] = await Promise.all([
    prisma.$queryRaw<EventMetricRow[]>`
      SELECT
        "eventName",
        COUNT(*)::int AS "total",
        COUNT(DISTINCT "userId")::int AS "users"
      FROM "product_events"
      WHERE "createdAt" >= CURRENT_TIMESTAMP - INTERVAL '30 days'
      GROUP BY "eventName"
      ORDER BY "total" DESC
    `,
    prisma.$queryRaw<DailyMetricRow[]>`
      SELECT
        DATE_TRUNC('day', "createdAt") AS "day",
        COUNT(*)::int AS "total"
      FROM "product_events"
      WHERE "createdAt" >= CURRENT_TIMESTAMP - INTERVAL '30 days'
        AND "eventName" = 'first_transaction_created'
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY "day" ASC
    `,
  ]);

  const metrics = new Map(eventMetrics.map((item) => [item.eventName, item]));
  const landingClicks = metrics.get("landing_cta_clicked")?.total || 0;
  const firstTransactions = metrics.get("first_transaction_created")?.total || 0;
  const onboardingCompleted = metrics.get("onboarding_completed")?.total || 0;
  const onboardingSkipped = metrics.get("onboarding_skipped")?.total || 0;
  const onboardingDecisions = onboardingCompleted + onboardingSkipped;
  const activationRate = landingClicks > 0
    ? Math.min(100, (firstTransactions / landingClicks) * 100)
    : 0;
  const onboardingCompletionRate = onboardingDecisions > 0
    ? (onboardingCompleted / onboardingDecisions) * 100
    : 0;

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
            Administração
          </span>
          <h1 className="dashboard-greeting mt-1">Métricas de ativação</h1>
          <p className="dashboard-subtitle">
            Eventos agregados dos últimos 30 dias, sem conteúdo financeiro ou dados de contato.
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-card--transactions">
          <div className="stat-card-header">
            <span className="stat-label">Cliques para começar</span>
            <MousePointerClick className="h-6 w-6 text-indigo-300" />
          </div>
          <div className="stat-value">{formatNumber.format(landingClicks)}</div>
          <div className="stat-footer">CTAs da página de vendas</div>
        </div>

        <div className="stat-card stat-card--balance">
          <div className="stat-card-header">
            <span className="stat-label">Primeiras transações</span>
            <ReceiptText className="h-6 w-6 text-emerald-300" />
          </div>
          <div className="stat-value">{formatNumber.format(firstTransactions)}</div>
          <div className="stat-footer">Usuários que chegaram ao primeiro valor percebido</div>
        </div>

        <div className="stat-card stat-card--income">
          <div className="stat-card-header">
            <span className="stat-label">Ativação estimada</span>
            <UserRoundCheck className="h-6 w-6 text-cyan-300" />
          </div>
          <div className="stat-value">{activationRate.toFixed(1)}%</div>
          <div className="stat-footer">Primeira transação ÷ cliques na landing</div>
        </div>

        <div className="stat-card stat-card--expense">
          <div className="stat-card-header">
            <span className="stat-label">Conclusão do guia</span>
            <CheckCircle2 className="h-6 w-6 text-amber-300" />
          </div>
          <div className="stat-value">{onboardingCompletionRate.toFixed(1)}%</div>
          <div className="stat-footer">Concluídos entre quem concluiu ou pulou</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="section-card">
          <div className="mb-5 flex items-center gap-3">
            <Activity className="h-5 w-5 text-emerald-300" />
            <div>
              <h2 className="font-semibold text-white">Eventos do funil</h2>
              <p className="text-sm text-gray-500">Total de eventos e usuários identificados.</p>
            </div>
          </div>

          {eventMetrics.length === 0 ? (
            <div className="empty-state py-12">
              <p>Nenhum evento registrado nos últimos 30 dias.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800/70">
              {eventMetrics.map((metric) => (
                <div key={metric.eventName} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-200">
                      {EVENT_LABELS[metric.eventName] || metric.eventName}
                    </p>
                    <p className="text-xs text-gray-600">{metric.eventName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-white">{formatNumber.format(metric.total)}</p>
                    <p className="text-xs text-gray-500">
                      {formatNumber.format(metric.users)} usuários
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="section-card">
          <h2 className="font-semibold text-white">Ativações por dia</h2>
          <p className="mt-1 text-sm text-gray-500">Primeiras transações registradas.</p>

          <div className="mt-6 space-y-3">
            {dailyActivations.length === 0 ? (
              <div className="empty-state py-12">
                <p>Ainda não há ativações no período.</p>
              </div>
            ) : (
              dailyActivations.slice(-14).map((item) => (
                <div key={item.day.toISOString()} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5">
                  <span className="text-sm text-gray-400">
                    {item.day.toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      timeZone: "UTC",
                    })}
                  </span>
                  <strong className="text-emerald-300">{formatNumber.format(item.total)}</strong>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
