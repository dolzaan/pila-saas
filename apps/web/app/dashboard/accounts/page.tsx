import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { FinancialAccountType } from "@prisma/client";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Banknote,
  ChartNoAxesCombined,
  CreditCard,
  Landmark,
  PiggyBank,
  WalletCards,
} from "lucide-react";
import { ArchiveAccountButton } from "@/components/accounts/archive-account-button";
import { FinancialAccountForm } from "@/components/accounts/financial-account-form";
import { FinancialImporter } from "@/components/accounts/financial-importer";

export const metadata: Metadata = {
  title: "Contas e cartões — Pila",
  description: "Organize seus saldos, cartões e extratos.",
};

const ACCOUNT_TYPE_LABELS: Record<FinancialAccountType, string> = {
  CHECKING: "Conta corrente",
  SAVINGS: "Poupança",
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartão de crédito",
  INVESTMENT: "Investimento",
  OTHER: "Outra conta",
};

function AccountIcon({ type }: { type: FinancialAccountType }) {
  const Icon =
    type === "CREDIT_CARD"
      ? CreditCard
      : type === "CASH"
        ? Banknote
        : type === "SAVINGS"
          ? PiggyBank
          : type === "INVESTMENT"
            ? ChartNoAxesCombined
            : Landmark;
  return <Icon className="h-5 w-5" />;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export default async function AccountsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [accounts, groupedTotals] = await Promise.all([
    prisma.financialAccount.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isArchived: "asc" }, { createdAt: "asc" }],
    }),
    prisma.transaction.groupBy({
      by: ["financialAccountId", "kind"],
      where: {
        userId: session.user.id,
        financialAccountId: { not: null },
      },
      _sum: { amount: true },
    }),
  ]);

  const totalsByAccount = new Map<string, { income: number; expense: number }>();
  for (const total of groupedTotals) {
    if (!total.financialAccountId) continue;
    const current = totalsByAccount.get(total.financialAccountId) || { income: 0, expense: 0 };
    current[total.kind === "INCOME" ? "income" : "expense"] = total._sum.amount?.toNumber() || 0;
    totalsByAccount.set(total.financialAccountId, current);
  }

  const activeAccounts = accounts.filter((account) => !account.isArchived);
  const archivedAccounts = accounts.filter((account) => account.isArchived);
  const cashBalance = activeAccounts
    .filter((account) => account.type !== "CREDIT_CARD")
    .reduce((sum, account) => {
      const totals = totalsByAccount.get(account.id) || { income: 0, expense: 0 };
      return sum + account.initialBalance.toNumber() + totals.income - totals.expense;
    }, 0);
  const cardPurchases = activeAccounts
    .filter((account) => account.type === "CREDIT_CARD")
    .reduce((sum, account) => {
      const totals = totalsByAccount.get(account.id) || { income: 0, expense: 0 };
      return sum + Math.max(0, totals.expense - totals.income);
    }, 0);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header flex-col gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="dashboard-greeting">Contas e cartões</h1>
          <p className="dashboard-subtitle">
            Acompanhe cada saldo e importe extratos sem duplicar lançamentos.
          </p>
        </div>
        <FinancialAccountForm />
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-card--balance">
          <div className="stat-card-header">
            <span className="stat-label">Saldo nas contas</span>
            <WalletCards className="h-6 w-6 text-emerald-400" />
          </div>
          <div className="stat-value">{formatCurrency(cashBalance)}</div>
          <div className="stat-footer">Saldo inicial + receitas - despesas</div>
        </div>
        <div className="stat-card stat-card--transactions">
          <div className="stat-card-header">
            <span className="stat-label">Contas ativas</span>
            <Landmark className="h-6 w-6 text-indigo-400" />
          </div>
          <div className="stat-value">{activeAccounts.length}</div>
          <div className="stat-footer">Incluindo cartões e dinheiro</div>
        </div>
        <div className="stat-card stat-card--expense">
          <div className="stat-card-header">
            <span className="stat-label">Compras nos cartões</span>
            <CreditCard className="h-6 w-6 text-red-400" />
          </div>
          <div className="stat-value text-red-300">{formatCurrency(cardPurchases)}</div>
          <div className="stat-footer">Total de despesas vinculadas</div>
        </div>
      </div>

      <section className="mb-8" aria-labelledby="active-accounts-title">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 id="active-accounts-title" className="text-lg font-semibold text-gray-100">
              Minhas contas
            </h2>
            <p className="mt-1 text-sm text-gray-500">Saldos calculados a partir dos lançamentos vinculados.</p>
          </div>
        </div>

        {activeAccounts.length === 0 ? (
          <div className="section-card empty-state">
            <WalletCards className="mb-3 h-10 w-10 text-gray-600" />
            <p>Nenhuma conta cadastrada.</p>
            <p className="empty-state-hint">Crie sua primeira conta ou cartão para começar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeAccounts.map((account) => {
              const totals = totalsByAccount.get(account.id) || { income: 0, expense: 0 };
              const isCard = account.type === "CREDIT_CARD";
              const balance = isCard
                ? Math.max(0, totals.expense - totals.income)
                : account.initialBalance.toNumber() + totals.income - totals.expense;
              const limit = account.creditLimit?.toNumber() || 0;

              return (
                <article
                  key={account.id}
                  className="section-card relative overflow-hidden transition-transform hover:-translate-y-0.5"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-indigo-500" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-xl bg-emerald-400/10 p-2.5 text-emerald-300">
                        <AccountIcon type={account.type} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-gray-100">{account.name}</h3>
                        <p className="text-xs text-gray-500">{ACCOUNT_TYPE_LABELS[account.type]}</p>
                      </div>
                    </div>
                    <ArchiveAccountButton id={account.id} isArchived={false} />
                  </div>

                  <div className="mt-6">
                    <p className="text-xs text-gray-500">
                      {isCard ? "Compras registradas" : "Saldo atual"}
                    </p>
                    <p className={`mt-1 text-2xl font-bold ${isCard ? "text-red-300" : "text-white"}`}>
                      {formatCurrency(balance)}
                    </p>
                  </div>

                  {isCard ? (
                    <div className="mt-5 space-y-2">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Limite disponível</span>
                        <span>{formatCurrency(Math.max(0, limit - balance))}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-400"
                          style={{ width: `${limit > 0 ? Math.min(100, (balance / limit) * 100) : 0}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600">
                        Fecha dia {account.closingDay} · vence dia {account.dueDay}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-5 flex justify-between text-xs text-gray-500">
                      <span>Entradas {formatCurrency(totals.income)}</span>
                      <span>Saídas {formatCurrency(totals.expense)}</span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="mb-8">
        <FinancialImporter
          accounts={activeAccounts.map((account) => ({ id: account.id, name: account.name }))}
        />
      </div>

      {archivedAccounts.length > 0 && (
        <section className="section-card" aria-labelledby="archived-accounts-title">
          <h2 id="archived-accounts-title" className="text-base font-semibold text-gray-200">
            Contas arquivadas
          </h2>
          <div className="mt-4 divide-y divide-gray-800">
            {archivedAccounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-400">{account.name}</p>
                  <p className="text-xs text-gray-600">{ACCOUNT_TYPE_LABELS[account.type]}</p>
                </div>
                <ArchiveAccountButton id={account.id} isArchived />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
