import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  Circle,
  MessageCircle,
  ReceiptText,
  Search,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard — Pila",
  description: "Visão geral das suas finanças pessoais.",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const firstName = session.user.name?.split(" ")[0] ?? "Usuário";

  // Data ranges for the current month
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Fetch dashboard data and onboarding progress together.
  const [currentMonthTransactions, userSetup] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        occurredAt: { gte: firstDay, lte: lastDay },
      },
      include: { category: true },
      orderBy: { occurredAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        whatsappNumber: true,
        _count: {
          select: {
            transactions: true,
            budgets: true,
          },
        },
      },
    }),
  ]);

  if (!userSetup) redirect("/login");

  const onboardingSteps = [
    {
      label: "Conectar o WhatsApp",
      description: "Registre movimentações conversando com o Pila.",
      href: "/dashboard/whatsapp",
      action: "Conectar",
      done: Boolean(userSetup.whatsappNumber),
      icon: MessageCircle,
    },
    {
      label: "Registrar a primeira transação",
      description: "Adicione uma receita ou despesa para iniciar seus relatórios.",
      href: "/dashboard/transactions",
      action: "Registrar",
      done: userSetup._count.transactions > 0,
      icon: ReceiptText,
    },
    {
      label: "Criar um orçamento",
      description: "Defina um limite para acompanhar uma categoria.",
      href: "/dashboard/budgets",
      action: "Criar orçamento",
      done: userSetup._count.budgets > 0,
      icon: Target,
    },
  ];

  const completedOnboardingSteps = onboardingSteps.filter((step) => step.done).length;
  const onboardingComplete = completedOnboardingSteps === onboardingSteps.length;

  // Calculate stats
  let totalIncome = 0;
  let totalExpense = 0;
  
  const expensesByCategory: Record<string, number> = {};

  for (const tx of currentMonthTransactions) {
    const val = tx.amount.toNumber();
    if (tx.kind === "INCOME") {
      totalIncome += val;
    } else {
      totalExpense += val;
      const catName = tx.category ? `${tx.category.icon} ${tx.category.name}` : "Sem Categoria";
      expensesByCategory[catName] = (expensesByCategory[catName] || 0) + val;
    }
  }

  const balance = totalIncome - totalExpense;

  // Chart data
  const chartData = Object.entries(expensesByCategory)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header dashboard-hero">
        <div>
          <span className="dashboard-kicker">Seu dinheiro, mais claro</span>
          <h1 className="dashboard-greeting">Olá, {firstName}! 👋</h1>
          <p className="dashboard-subtitle">
            Aqui está o resumo das suas finanças.
          </p>
        </div>
        <div className="dashboard-period">
          <span className="period-badge">
            {now.toLocaleString("pt-BR", { month: "long", year: "numeric" })}
          </span>
        </div>
      </div>

      {!onboardingComplete && (
        <section className="onboarding-card" aria-labelledby="onboarding-title">
          <div className="onboarding-header">
            <div>
              <span className="dashboard-kicker">Primeiros passos</span>
              <h2 id="onboarding-title">Prepare o Pila para trabalhar por você</h2>
              <p>{completedOnboardingSteps} de {onboardingSteps.length} etapas concluídas</p>
            </div>
            <div
              className="onboarding-progress"
              role="progressbar"
              aria-label="Progresso da configuração inicial"
              aria-valuemin={0}
              aria-valuemax={onboardingSteps.length}
              aria-valuenow={completedOnboardingSteps}
            >
              <span style={{ width: `${(completedOnboardingSteps / onboardingSteps.length) * 100}%` }} />
            </div>
          </div>

          <ol className="onboarding-steps">
            {onboardingSteps.map(({ label, description, href, action, done, icon: Icon }) => (
              <li key={label} className={done ? "onboarding-step onboarding-step--done" : "onboarding-step"}>
                <div className="onboarding-step-icon" aria-hidden="true">
                  <Icon />
                </div>
                <div>
                  <h3>
                    {done ? <CheckCircle2 aria-hidden="true" /> : <Circle aria-hidden="true" />}
                    {label}
                  </h3>
                  <p>{description}</p>
                </div>
                {done ? (
                  <span className="onboarding-complete">Concluído</span>
                ) : (
                  <Link href={href} className="app-button app-button--secondary app-button--compact">
                    {action}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Cards de resumo */}
      <div className="stats-grid">
        <div className="stat-card stat-card--balance">
          <div className="stat-card-header">
            <span className="stat-label">Saldo do mês</span>
            <Wallet className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="stat-value">{formatCurrency(balance)}</div>
          <div className="stat-footer">
            Balanço de Receitas - Despesas
          </div>
        </div>

        <div className="stat-card stat-card--expense">
          <div className="stat-card-header">
            <span className="stat-label">Gastos</span>
            <TrendingDown className="w-6 h-6 text-red-400" />
          </div>
          <div className="stat-value text-red-400">{formatCurrency(totalExpense)}</div>
          <div className="stat-footer">Este mês</div>
        </div>

        <div className="stat-card stat-card--income">
          <div className="stat-card-header">
            <span className="stat-label">Receitas</span>
            <TrendingUp className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="stat-value text-emerald-400">{formatCurrency(totalIncome)}</div>
          <div className="stat-footer">Este mês</div>
        </div>

        <div className="stat-card stat-card--transactions">
          <div className="stat-card-header">
            <span className="stat-label">Transações</span>
            <Activity className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="stat-value">{currentMonthTransactions.length}</div>
          <div className="stat-footer">Neste mês</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 section-card mb-0">
          <h2 className="section-title">Despesas por Categoria</h2>
          <div className="mt-4">
            <OverviewChart data={chartData} />
          </div>
        </div>

        <div className="section-card mb-0 flex flex-col justify-between">
          <div>
            <h2 className="section-title">Transações Recentes</h2>
            {currentMonthTransactions.length === 0 ? (
               <div className="empty-state py-8">
                <Search className="w-8 h-8 text-gray-500 mb-2" />
                <p className="text-sm">Nenhuma transação ainda.</p>
                <Link href="/dashboard/transactions" className="app-button app-button--secondary app-button--compact mt-3">
                  Registrar primeira transação
                </Link>
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                {currentMonthTransactions.slice(0, 5).map(tx => (
                  <div key={tx.id} className="flex justify-between items-center pb-3 border-b border-gray-800/50 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl opacity-80">{tx.category?.icon || "💵"}</div>
                      <div>
                        <div className="text-gray-200 text-sm font-medium">{tx.description || tx.category?.name || "Sem descrição"}</div>
                        <div className="text-gray-500 text-xs">{tx.occurredAt.toLocaleDateString("pt-BR")}</div>
                      </div>
                    </div>
                    <div className={`text-sm font-medium ${tx.kind === "INCOME" ? "text-emerald-400" : "text-gray-200"}`}>
                      {tx.kind === "INCOME" ? "+" : "-"}{formatCurrency(tx.amount.toNumber())}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-6 pt-4 border-t border-gray-800">
            <Link href="/dashboard/transactions" className="text-emerald-500 hover:text-emerald-400 text-sm font-medium transition-colors w-full inline-block text-center">
              Ver todas as transações →
            </Link>
          </div>
        </div>
      </div>

      {/* CTA WhatsApp */}
      {!userSetup.whatsappNumber && (
      <div className="whatsapp-cta">
        <div className="whatsapp-cta-icon">📱</div>
        <div className="whatsapp-cta-content">
          <h2 className="whatsapp-cta-title">Conecte seu WhatsApp</h2>
          <p className="whatsapp-cta-desc">
            Registre gastos e receitas enviando mensagens de texto. Ex:{" "}
            <code>gastei 45 no mercado</code> ou <code>recebi 3000 de salário</code>.
          </p>
        </div>
        <Link href="/dashboard/whatsapp" className="btn-whatsapp">
          Conectar agora
        </Link>
      </div>
      )}
    </div>
  );
}
