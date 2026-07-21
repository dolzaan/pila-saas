import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import Link from "next/link";
import { Wallet, TrendingDown, TrendingUp, Activity, Search, MessageCircle, CheckCircle2, ArrowRight, AlertTriangle, Send } from "lucide-react";
import { getPilaWhatsappUrl, PILA_WHATSAPP_DISPLAY, PILA_WHATSAPP_NUMBER } from "@/lib/whatsapp-contact";
import { getTelegramBotUsername } from "@/lib/telegram";

export const metadata: Metadata = {
  title: "Dashboard — Pila",
  description: "Visão geral das suas finanças pessoais.",
};

async function isWhatsappBotConnected() {
  const apiUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instanceName = process.env.EVOLUTION_INSTANCE_NAME || "FinZapBot";

  if (!apiUrl || !apiKey) return false;

  try {
    const response = await fetch(
      `${apiUrl}/instance/connectionState/${instanceName}`,
      {
        headers: { apikey: apiKey },
        cache: "no-store",
      },
    );

    if (!response.ok) return false;

    const data = await response.json();
    return data?.instance?.state === "open";
  } catch (error) {
    console.error("[Dashboard] Erro ao verificar conexão do WhatsApp:", error);
    return false;
  }
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const firstName = session.user.name?.split(" ")[0] ?? "Usuário";

  const [user, whatsappBotConnected] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        whatsappVerifiedAt: true,
        whatsappNumber: true,
        accounts: {
          where: { provider: "telegram" },
          select: { id: true },
          take: 1,
        },
      },
    }),
    isWhatsappBotConnected(),
  ]);

  const userWhatsappLinked = Boolean(user?.whatsappVerifiedAt && user?.whatsappNumber);
  const userTelegramLinked = Boolean(user?.accounts[0]);
  const whatsappUrl = getPilaWhatsappUrl("Olá, Pila! Quero conectar minha conta e começar a registrar minhas finanças por aqui.");
  const telegramBotUsername = getTelegramBotUsername();
  const telegramBotUrl = telegramBotUsername
    ? `https://t.me/${telegramBotUsername}`
    : null;

  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const currentMonthTransactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      occurredAt: { gte: firstDay, lte: lastDay },
    },
    include: { category: true },
    orderBy: { occurredAt: "desc" },
  });

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
  const chartData = Object.entries(expensesByCategory)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header dashboard-hero">
        <div>
          <span className="dashboard-kicker">Seu dinheiro, mais claro</span>
          <h1 className="dashboard-greeting">Olá, {firstName}! 👋</h1>
          <p className="dashboard-subtitle">Aqui está o resumo das suas finanças.</p>
        </div>
        <div className="dashboard-period">
          <span className="period-badge">
            {now.toLocaleString("pt-BR", { month: "long", year: "numeric" })}
          </span>
        </div>
      </div>

      {!whatsappBotConnected && (
        <section
          className="section-card mb-8 !p-5 sm:!p-6 border-amber-400/30 bg-amber-400/5"
          aria-labelledby="whatsapp-unavailable-title"
          role="status"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400/15 sm:h-12 sm:w-12">
              <AlertTriangle className="h-5 w-5 text-amber-300 sm:h-6 sm:w-6" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:gap-2.5">
              <span className="dashboard-kicker !mb-0 text-amber-300">
                WhatsApp temporariamente indisponível
              </span>
              <h2
                id="whatsapp-unavailable-title"
                className="section-title !m-0 leading-snug"
              >
                Continue usando o Pila pelo Telegram
              </h2>
              <p className="!m-0 max-w-3xl text-sm leading-6 text-gray-400 sm:text-base">
                Estamos trabalhando para normalizar o WhatsApp. Enquanto isso, você pode registrar movimentações, consultar suas finanças e pedir relatórios pelo Telegram, ou continuar usando normalmente os recursos do site.
              </p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {userTelegramLinked && telegramBotUrl ? (
                  <a
                    href={telegramBotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="app-button app-button--primary inline-flex items-center justify-center gap-2"
                  >
                    Abrir Telegram
                    <Send className="h-4 w-4" />
                  </a>
                ) : (
                  <Link
                    href="/dashboard/settings#telegram"
                    className="app-button app-button--primary inline-flex items-center justify-center gap-2"
                  >
                    Conectar Telegram
                    <Send className="h-4 w-4" />
                  </Link>
                )}
                <Link
                  href="/dashboard/settings#telegram"
                  className="app-button app-button--secondary inline-flex items-center justify-center"
                >
                  Gerenciar canais
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {whatsappBotConnected && !userWhatsappLinked && (
        <section className="section-card whatsapp-onboarding-card border-emerald-400/30 bg-emerald-400/5" aria-labelledby="whatsapp-onboarding-title">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="h-12 w-12 shrink-0 rounded-2xl bg-emerald-400/15 flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <span className="dashboard-kicker">Passo necessário para começar</span>
                <h2 id="whatsapp-onboarding-title" className="section-title mt-1">Envie uma mensagem para o WhatsApp do Pila</h2>
                <p className="text-gray-400 mt-2 max-w-2xl">
                  É por esse número que você vai registrar gastos, receitas e consultar sua vida financeira. Mande um “Olá” e depois conclua a vinculação da sua conta.
                </p>
                <div className="flex flex-wrap gap-3 mt-4 text-sm">
                  <span className="inline-flex items-center gap-2 text-gray-300">
                    <span className="h-6 w-6 rounded-full bg-emerald-400 text-emerald-950 font-bold flex items-center justify-center">1</span>
                    Chame {PILA_WHATSAPP_DISPLAY}
                  </span>
                  <span className="inline-flex items-center gap-2 text-gray-300">
                    <span className="h-6 w-6 rounded-full bg-white/10 text-white font-bold flex items-center justify-center">2</span>
                    Vincule sua conta
                  </span>
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row xl:shrink-0">
              <a
                href={whatsappUrl}
                target={PILA_WHATSAPP_NUMBER ? "_blank" : undefined}
                rel={PILA_WHATSAPP_NUMBER ? "noopener noreferrer" : undefined}
                className="btn-whatsapp inline-flex items-center justify-center gap-2"
              >
                Mandar mensagem
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link href="/dashboard/whatsapp" className="app-button app-button--secondary">
                Já mandei a mensagem
              </Link>
            </div>
          </div>
        </section>
      )}

      {whatsappBotConnected && userWhatsappLinked && (
        <div className="flex items-center gap-2 text-sm text-emerald-300 mb-6 px-1">
          <CheckCircle2 className="h-4 w-4" />
          WhatsApp conectado e pronto para receber seus lançamentos.
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card stat-card--balance">
          <div className="stat-card-header"><span className="stat-label">Saldo do mês</span><Wallet className="w-6 h-6 text-emerald-400" /></div>
          <div className="stat-value">{formatCurrency(balance)}</div>
          <div className="stat-footer">Balanço de Receitas - Despesas</div>
        </div>
        <div className="stat-card stat-card--expense">
          <div className="stat-card-header"><span className="stat-label">Gastos</span><TrendingDown className="w-6 h-6 text-red-400" /></div>
          <div className="stat-value text-red-400">{formatCurrency(totalExpense)}</div>
          <div className="stat-footer">Este mês</div>
        </div>
        <div className="stat-card stat-card--income">
          <div className="stat-card-header"><span className="stat-label">Receitas</span><TrendingUp className="w-6 h-6 text-emerald-400" /></div>
          <div className="stat-value text-emerald-400">{formatCurrency(totalIncome)}</div>
          <div className="stat-footer">Este mês</div>
        </div>
        <div className="stat-card stat-card--transactions">
          <div className="stat-card-header"><span className="stat-label">Transações</span><Activity className="w-6 h-6 text-indigo-400" /></div>
          <div className="stat-value">{currentMonthTransactions.length}</div>
          <div className="stat-footer">Neste mês</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 section-card mb-0">
          <h2 className="section-title">Despesas por Categoria</h2>
          <div className="mt-4"><OverviewChart data={chartData} /></div>
        </div>
        <div className="section-card mb-0 flex flex-col justify-between">
          <div>
            <h2 className="section-title">Transações Recentes</h2>
            {currentMonthTransactions.length === 0 ? (
              <div className="empty-state py-8"><Search className="w-8 h-8 text-gray-500 mb-2" /><p className="text-sm">Nenhuma transação ainda.</p></div>
            ) : (
              <div className="space-y-4 mt-4">
                {currentMonthTransactions.slice(0, 5).map((tx) => (
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

      {whatsappBotConnected && userWhatsappLinked && (
        <div className="whatsapp-cta">
          <div className="whatsapp-cta-icon">📱</div>
          <div className="whatsapp-cta-content">
            <h2 className="whatsapp-cta-title">Registre pelo WhatsApp</h2>
            <p className="whatsapp-cta-desc">Envie mensagens como <code>gastei 45 no mercado</code> ou <code>recebi 3000 de salário</code>.</p>
          </div>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-whatsapp">Abrir conversa</a>
        </div>
      )}
    </div>
  );
}
