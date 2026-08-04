import { ArchiveAccountButton } from "@/components/accounts/archive-account-button";
import { AccountTransferForm } from "@/components/accounts/account-transfer-form";
import { BenefitRechargeForm } from "@/components/accounts/benefit-recharge-form";
import { FinancialAccountForm } from "@/components/accounts/financial-account-form";
import { FinancialImporter } from "@/components/accounts/financial-importer";
import { getAccountLedgerSummaries } from "@/lib/account-ledger";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { BenefitCardType, FinancialAccountType } from "@prisma/client";
import {
  Banknote,
  Bus,
  ChartNoAxesCombined,
  CreditCard,
  Gift,
  Landmark,
  PiggyBank,
  Utensils,
  WalletCards,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Contas e cartões — Pila",
  description: "Organize seus saldos, cartões, benefícios e extratos.",
};

const ACCOUNT_TYPE_LABELS: Record<FinancialAccountType, string> = {
  CHECKING: "Conta corrente",
  SAVINGS: "Poupança",
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartão de crédito",
  BENEFIT_CARD: "Cartão-benefício",
  INVESTMENT: "Investimento",
  OTHER: "Outra conta",
};

const BENEFIT_TYPE_LABELS: Record<BenefitCardType, string> = {
  FOOD: "Alimentação",
  MEAL: "Refeição",
  MOBILITY: "Mobilidade",
  CULTURE: "Cultura",
  FLEXIBLE: "Flexível",
};

function AccountIcon({ type }: { type: FinancialAccountType }) {
  const Icon =
    type === "CREDIT_CARD"
      ? CreditCard
      : type === "BENEFIT_CARD"
        ? Gift
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

function currentMonthRange() {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
}

function nextRechargeLabel(rechargeDay: number | null) {
  if (!rechargeDay) return null;
  const now = new Date();
  let target = new Date(now.getFullYear(), now.getMonth(), Math.min(rechargeDay, 28));
  if (target < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    target = new Date(now.getFullYear(), now.getMonth() + 1, Math.min(rechargeDay, 28));
  }
  return target.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

type AccountsPageProps = {
  searchParams: Promise<{ cartoes?: string }>;
};

export default async function AccountsPage({ searchParams }: AccountsPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const query = await searchParams;
  const selectedCardTab = query.cartoes === "beneficios" ? "beneficios" : "credito";
  const month = currentMonthRange();
  const [accounts, ledgerSummaries, monthlyBenefitTotals] = await Promise.all([
    prisma.financialAccount.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isArchived: "asc" }, { createdAt: "asc" }],
    }),
    getAccountLedgerSummaries(session.user.id),
    prisma.transaction.groupBy({
      by: ["financialAccountId", "kind"],
      where: {
        userId: session.user.id,
        occurredAt: { gte: month.start, lt: month.end },
        financialAccount: { type: "BENEFIT_CARD" },
      },
      _sum: { amount: true },
    }),
  ]);

  const activeAccounts = accounts.filter((account) => !account.isArchived);
  const regularAccounts = activeAccounts.filter(
    (account) => account.type !== "CREDIT_CARD" && account.type !== "BENEFIT_CARD",
  );
  const creditCards = activeAccounts.filter((account) => account.type === "CREDIT_CARD");
  const benefitCards = activeAccounts.filter((account) => account.type === "BENEFIT_CARD");
  const displayedCards = selectedCardTab === "beneficios" ? benefitCards : creditCards;
  const archivedAccounts = accounts.filter((account) => account.isArchived);
  const transferableAccounts = regularAccounts.map((account) => ({ id: account.id, name: account.name }));

  const cashBalance = regularAccounts.reduce(
    (sum, account) => sum + (ledgerSummaries.get(account.id)?.balance || 0),
    0,
  );
  const benefitBalance = benefitCards.reduce(
    (sum, account) => sum + (ledgerSummaries.get(account.id)?.balance || 0),
    0,
  );
  const cardOutstanding = creditCards.reduce(
    (sum, account) => sum + (ledgerSummaries.get(account.id)?.outstandingBalance || 0),
    0,
  );
  const benefitMonthByAccount = new Map<string, { income: number; expense: number }>();
  for (const total of monthlyBenefitTotals) {
    if (!total.financialAccountId) continue;
    const current = benefitMonthByAccount.get(total.financialAccountId) || { income: 0, expense: 0 };
    current[total.kind === "INCOME" ? "income" : "expense"] = Number(total._sum.amount || 0);
    benefitMonthByAccount.set(total.financialAccountId, current);
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header flex-col gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="dashboard-greeting">Contas e cartões</h1>
          <p className="dashboard-subtitle">
            Acompanhe saldos, faturas, cartões-benefício e extratos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AccountTransferForm accounts={transferableAccounts} />
          <FinancialAccountForm />
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-card--balance">
          <div className="stat-card-header">
            <span className="stat-label">Saldo nas contas</span>
            <WalletCards className="h-6 w-6 text-emerald-400" />
          </div>
          <div className="stat-value">{formatCurrency(cashBalance)}</div>
          <div className="stat-footer">Contas, dinheiro e investimentos</div>
        </div>
        <div className="stat-card stat-card--transactions">
          <div className="stat-card-header">
            <span className="stat-label">Saldo em benefícios</span>
            <Utensils className="h-6 w-6 text-indigo-400" />
          </div>
          <div className="stat-value">{formatCurrency(benefitBalance)}</div>
          <div className="stat-footer">Disponível para alimentação e outros benefícios</div>
        </div>
        <div className="stat-card stat-card--expense">
          <div className="stat-card-header">
            <span className="stat-label">Faturas pendentes</span>
            <CreditCard className="h-6 w-6 text-red-400" />
          </div>
          <div className="stat-value text-red-300">{formatCurrency(cardOutstanding)}</div>
          <div className="stat-footer">Compras menos pagamentos de fatura</div>
        </div>
      </div>

      <section className="mb-8" aria-labelledby="active-accounts-title">
        <div className="mb-4">
          <h2 id="active-accounts-title" className="text-lg font-semibold text-gray-100">Minhas contas</h2>
          <p className="mt-1 text-sm text-gray-500">Transferências movimentam o saldo sem virar receita ou despesa.</p>
        </div>

        {regularAccounts.length === 0 ? (
          <div className="section-card empty-state">
            <WalletCards className="mb-3 h-10 w-10 text-gray-600" />
            <p>Nenhuma conta cadastrada.</p>
            <p className="empty-state-hint">Crie uma conta, dinheiro ou investimento para começar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {regularAccounts.map((account) => {
              const summary = ledgerSummaries.get(account.id);
              return (
                <article key={account.id} className="section-card relative overflow-hidden transition-transform hover:-translate-y-0.5">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-indigo-500" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-xl bg-emerald-400/10 p-2.5 text-emerald-300"><AccountIcon type={account.type} /></div>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-gray-100">{account.name}</h3>
                        <p className="text-xs text-gray-500">{ACCOUNT_TYPE_LABELS[account.type]}</p>
                      </div>
                    </div>
                    <ArchiveAccountButton id={account.id} isArchived={false} />
                  </div>
                  <div className="mt-6">
                    <p className="text-xs text-gray-500">Saldo atual</p>
                    <p className="mt-1 text-2xl font-bold text-white">{formatCurrency(summary?.balance || 0)}</p>
                  </div>
                  <div className="mt-5 space-y-2 text-xs text-gray-500">
                    <div className="flex justify-between gap-3">
                      <span>Entradas {formatCurrency(summary?.income || 0)}</span>
                      <span>Saídas {formatCurrency(summary?.expense || 0)}</span>
                    </div>
                    {(summary?.cardPaymentsSent || 0) > 0 && (
                      <div className="flex justify-between text-gray-600"><span>Faturas pagas</span><span>{formatCurrency(summary?.cardPaymentsSent || 0)}</span></div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mb-8" aria-labelledby="cards-title">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="cards-title" className="text-lg font-semibold text-gray-100">Cartões</h2>
            <p className="mt-1 text-sm text-gray-500">Crédito gera fatura; benefício usa o saldo já recebido.</p>
          </div>
          <div className="inline-flex w-full rounded-xl border border-white/10 bg-white/[0.03] p-1 sm:w-auto" aria-label="Tipo de cartão">
            <Link
              href="/dashboard/accounts?cartoes=credito"
              aria-current={selectedCardTab === "credito" ? "page" : undefined}
              className={`flex-1 rounded-lg px-4 py-2 text-center text-sm font-medium transition-colors sm:flex-none ${selectedCardTab === "credito" ? "bg-emerald-400 text-gray-950" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
            >
              Crédito <span className="ml-1 opacity-70">{creditCards.length}</span>
            </Link>
            <Link
              href="/dashboard/accounts?cartoes=beneficios"
              aria-current={selectedCardTab === "beneficios" ? "page" : undefined}
              className={`flex-1 rounded-lg px-4 py-2 text-center text-sm font-medium transition-colors sm:flex-none ${selectedCardTab === "beneficios" ? "bg-emerald-400 text-gray-950" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
            >
              Benefícios <span className="ml-1 opacity-70">{benefitCards.length}</span>
            </Link>
          </div>
        </div>

        {displayedCards.length === 0 ? (
          <div className="section-card empty-state">
            {selectedCardTab === "beneficios" ? <Gift className="mb-3 h-10 w-10 text-gray-600" /> : <CreditCard className="mb-3 h-10 w-10 text-gray-600" />}
            <p>{selectedCardTab === "beneficios" ? "Nenhum cartão-benefício cadastrado." : "Nenhum cartão de crédito cadastrado."}</p>
            <p className="empty-state-hint">Use “Nova conta ou cartão” e escolha o tipo desejado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {displayedCards.map((account) => {
              const summary = ledgerSummaries.get(account.id);
              const isBenefit = account.type === "BENEFIT_CARD";
              const limit = account.creditLimit?.toNumber() || 0;
              const availableLimit = summary?.availableLimit ?? null;
              const limitUsage = limit > 0 ? Math.min(100, ((summary?.balance || 0) / limit) * 100) : 0;
              const monthly = benefitMonthByAccount.get(account.id) || { income: 0, expense: 0 };
              const nextRecharge = nextRechargeLabel(account.rechargeDay);

              return (
                <article key={account.id} className="section-card relative overflow-hidden transition-transform hover:-translate-y-0.5">
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${isBenefit ? "from-emerald-300 to-teal-500" : "from-indigo-400 to-fuchsia-500"}`} />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`rounded-xl p-2.5 ${isBenefit ? "bg-emerald-400/10 text-emerald-300" : "bg-indigo-400/10 text-indigo-300"}`}><AccountIcon type={account.type} /></div>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-gray-100">{account.name}</h3>
                        <p className="text-xs text-gray-500">{isBenefit && account.benefitType ? BENEFIT_TYPE_LABELS[account.benefitType] : ACCOUNT_TYPE_LABELS[account.type]}</p>
                      </div>
                    </div>
                    <ArchiveAccountButton id={account.id} isArchived={false} />
                  </div>

                  <div className="mt-6">
                    <p className="text-xs text-gray-500">{isBenefit ? "Saldo disponível" : "Fatura pendente"}</p>
                    <p className={`mt-1 text-2xl font-bold ${isBenefit ? "text-emerald-200" : "text-red-300"}`}>{formatCurrency(summary?.balance || 0)}</p>
                  </div>

                  {isBenefit ? (
                    <div className="mt-5 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-white/[0.03] p-3">
                          <p className="text-[11px] text-gray-500">Recebido no mês</p>
                          <p className="mt-1 text-sm font-semibold text-emerald-300">{formatCurrency(monthly.income)}</p>
                        </div>
                        <div className="rounded-xl bg-white/[0.03] p-3">
                          <p className="text-[11px] text-gray-500">Gasto no mês</p>
                          <p className="mt-1 text-sm font-semibold text-gray-200">{formatCurrency(monthly.expense)}</p>
                        </div>
                      </div>
                      {(account.expectedRecharge || nextRecharge) && (
                        <div className="space-y-1 text-xs text-gray-500">
                          {account.expectedRecharge && <p>Recarga prevista: <span className="text-gray-300">{formatCurrency(account.expectedRecharge.toNumber())}</span></p>}
                          {nextRecharge && <p>Próxima previsão: <span className="text-gray-300">{nextRecharge}</span></p>}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {account.benefitType === "MOBILITY" ? <Bus className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
                        {account.balanceCarriesOver ? "Saldo acumula para o próximo mês" : "Saldo não configurado para acumular"}
                      </div>
                      <BenefitRechargeForm accountId={account.id} accountName={account.name} expectedAmount={account.expectedRecharge?.toNumber() || null} />
                    </div>
                  ) : (
                    <div className="mt-5 space-y-2">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Limite disponível</span>
                        <span className={availableLimit !== null && availableLimit < 0 ? "text-red-300" : undefined}>{availableLimit === null ? "Não cadastrado" : formatCurrency(availableLimit)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-400" style={{ width: `${limitUsage}%` }} /></div>
                      <div className="flex justify-between text-[11px] text-gray-600"><span>Compras {formatCurrency(summary?.expense || 0)}</span><span>Pagamentos {formatCurrency(summary?.cardPaymentsReceived || 0)}</span></div>
                      <p className="text-xs text-gray-600">Fecha dia {account.closingDay} · vence dia {account.dueDay}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="mb-8">
        <FinancialImporter accounts={activeAccounts.map((account) => ({ id: account.id, name: account.name }))} />
      </div>

      {archivedAccounts.length > 0 && (
        <section className="section-card" aria-labelledby="archived-accounts-title">
          <h2 id="archived-accounts-title" className="text-base font-semibold text-gray-200">Contas e cartões arquivados</h2>
          <div className="mt-4 divide-y divide-gray-800">
            {archivedAccounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between gap-3 py-3">
                <div><p className="text-sm font-medium text-gray-400">{account.name}</p><p className="text-xs text-gray-600">{ACCOUNT_TYPE_LABELS[account.type]}</p></div>
                <ArchiveAccountButton id={account.id} isArchived />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
