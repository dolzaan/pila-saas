import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccountLedgerSummaries } from "@/lib/account-ledger";
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

  const [accounts, ledgerSummaries] = await Promise.all([
    prisma.financialAccount.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isArchived: "asc" }, { createdAt: "asc" }],
    }),
    getAccountLedgerSummaries(session.user.id),
  ]);

  const activeAccounts = accounts.filter((account) => !account.isArchived);
  const archivedAccounts = accounts.filter((account) => account.isArchived);
  const cashBalance = activeAccounts
    .filter((account) => account.type !== "CREDIT_CARD")
    .reduce(
      (sum, account) => sum + (ledgerSummaries.get(account.id)?.balance || 0),
      0,
    );
  const cardOutstanding = activeAccounts
    .filter((account) => account.type === "CREDIT_CARD")
    .reduce(
      (sum, account) =>
        sum + (ledgerSummaries.get(account.id)?.outstandingBalance || 0),
      0,
    );

  return (
    <div className="dashboard-page">
      <div className="dashboard-header flex-col gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="dashboard-greeting">Contas e cartões</h1>
          <p className="dashboard-subtitle">
            Acompanhe saldos, pagamentos de fatura e extratos sem duplicar lançamentos.
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
          <div className="stat-footer">
            Saldo inicial + receitas - despesas - faturas pagas
          </div>
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
            <span className="stat-label">Saldo dos cartões</span>
            <CreditCard className="h-6 w-6 text-red-400" />
          </div>
          <div className="stat-value text-red-300">
            {formatCurrency(cardOutstanding)}
          </div>
          <div className="stat-footer">
            Compras registradas menos pagamentos de fatura
          </div>
        </div>
      </div>

      <section className="mb-8" aria-labelledby="active-accounts-title">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 id="active-accounts-title" className="text-lg font-semibold text-gray-100">
              Minhas contas
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Os saldos consideram movimentações e pagamentos de cartão registrados no Pila.
            </p>
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
              const summary = ledgerSummaries.get(account.id);
              const isCard = account.type === "CREDIT_CARD";
              const balance = summary?.balance || 0;
              const limit = account.creditLimit?.toNumber() || 0;
              const availableLimit = summary?.availableLimit ?? null;
              const limitUsage = limit > 0 ? Math.min(100, (balance / limit) * 100) : 0;

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
                      {isCard ? "Saldo pendente" : "Saldo atual"}
                    </p>
                    <p className={`mt-1 text-2xl font-bold ${isCard ? "text-red-300" : "text-white"}`}>
                      {formatCurrency(balance)}
                    </p>
                  </div>

                  {isCard ? (
                    <div className="mt-5 space-y-2">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Limite disponível</span>
                        <span className={availableLimit !== null && availableLimit < 0 ? "text-red-300" : undefined}>
                          {availableLimit === null
                            ? "Não cadastrado"
                            : formatCurrency(availableLimit)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-400"
                          style={{ width: `${limitUsage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-gray-600">
                        <span>Compras {formatCurrency(summary?.expense || 0)}</span>
                        <span>Pagamentos {formatCurrency(summary?.cardPaymentsReceived || 0)}</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Fecha dia {account.closingDay} · vence dia {account.dueDay}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-5 space-y-2 text-xs text-gray-500">
                      <div className="flex justify-between">
                        <span>Entradas {formatCurrency(summary?.income || 0)}</span>
                        <span>Saídas {formatCurrency(summary?.expense || 0)}</span>
                      </div>
                      {(summary?.cardPaymentsSent || 0) > 0 && (
                        <div className="flex justify-between text-gray-600">
                          <span>Faturas pagas</span>
                          <span>{formatCurrency(summary?.cardPaymentsSent || 0)}</span>
                        </div>
                      )}
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
