import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saoPauloDateKey } from "@/lib/reminders";
import {
  CheckCheck,
  Landmark,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ReconciliationForm } from "@/components/reconciliation/reconciliation-form";
import { TransactionRuleCard } from "@/components/reconciliation/transaction-rule-card";
import { TransactionRuleForm } from "@/components/reconciliation/transaction-rule-form";
import { UndoReconciliationButton } from "@/components/reconciliation/undo-reconciliation-button";

export const metadata: Metadata = {
  title: "Conciliação e regras — Pila",
  description: "Confira saldos e automatize a categorização dos lançamentos.",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export default async function ReconciliationPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [accounts, categories, rules, reconciliations, pendingByAccount] =
    await Promise.all([
      prisma.financialAccount.findMany({
        where: { userId: session.user.id, isArchived: false },
        orderBy: { name: "asc" },
        select: { id: true, name: true, type: true },
      }),
      prisma.category.findMany({
        where: { OR: [{ userId: null }, { userId: session.user.id }] },
        orderBy: [{ kind: "asc" }, { name: "asc" }],
        select: { id: true, name: true, icon: true, kind: true },
      }),
      prisma.transactionRule.findMany({
        where: { userId: session.user.id },
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
        include: {
          category: { select: { name: true, icon: true } },
          financialAccount: { select: { name: true } },
          _count: { select: { transactions: true } },
        },
      }),
      prisma.accountReconciliation.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          financialAccount: { select: { name: true } },
        },
      }),
      prisma.transaction.groupBy({
        by: ["financialAccountId"],
        where: {
          userId: session.user.id,
          financialAccountId: { not: null },
          reconciliationId: null,
        },
        _count: { _all: true },
      }),
    ]);

  const pendingMap = new Map(
    pendingByAccount.flatMap((item) =>
      item.financialAccountId
        ? [[item.financialAccountId, item._count._all] as const]
        : [],
    ),
  );
  const accountOptions = accounts.map((account) => ({
    ...account,
    unreconciledCount: pendingMap.get(account.id) || 0,
  }));
  const pendingTotal = accountOptions.reduce(
    (total, account) => total + account.unreconciledCount,
    0,
  );
  const activeRules = rules.filter((rule) => rule.isActive).length;
  const reconciledTransactions = reconciliations.reduce(
    (total, item) => total + item.transactionCount,
    0,
  );

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-greeting">Conciliação e regras</h1>
          <p className="dashboard-subtitle">
            Faça o saldo do Pila conferir com o banco e reduza o trabalho manual.
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-card--transactions">
          <div className="stat-card-header">
            <span className="stat-label">Aguardando conciliação</span>
            <RefreshCcw className="h-6 w-6 text-indigo-400" />
          </div>
          <div className="stat-value">{pendingTotal}</div>
          <div className="stat-footer">Lançamentos vinculados a contas</div>
        </div>
        <div className="stat-card stat-card--income">
          <div className="stat-card-header">
            <span className="stat-label">Regras ativas</span>
            <Sparkles className="h-6 w-6 text-emerald-400" />
          </div>
          <div className="stat-value text-emerald-300">{activeRules}</div>
          <div className="stat-footer">Categorização automática</div>
        </div>
        <div className="stat-card stat-card--balance">
          <div className="stat-card-header">
            <span className="stat-label">Já conciliados</span>
            <CheckCheck className="h-6 w-6 text-emerald-400" />
          </div>
          <div className="stat-value">{reconciledTransactions}</div>
          <div className="stat-footer">Nos últimos {reconciliations.length} fechamentos</div>
        </div>
      </div>

      <section className="section-card mb-8" aria-labelledby="reconciliation-title">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="dashboard-kicker text-indigo-300">Conferência de saldo</span>
            <h2 id="reconciliation-title" className="text-lg font-semibold text-gray-100">
              Conciliar extrato
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Informe o saldo exibido pelo banco. A confirmação só é liberada quando a
              diferença chegar a zero.
            </p>
          </div>
          {accounts.length === 0 && (
            <Link href="/dashboard/accounts" className="app-button app-button--secondary">
              <Landmark className="h-4 w-4" />
              Cadastrar conta
            </Link>
          )}
        </div>
        <ReconciliationForm accounts={accountOptions} defaultDate={saoPauloDateKey()} />
      </section>

      <section className="mb-8" aria-labelledby="rules-title">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-300" />
              <h2 id="rules-title" className="text-lg font-semibold text-gray-100">
                Regras automáticas
              </h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              As regras mais específicas, com palavras-chave maiores, têm prioridade.
            </p>
          </div>
          <TransactionRuleForm
            categories={categories}
            accounts={accounts.map(({ id, name }) => ({ id, name }))}
          />
        </div>

        {rules.length === 0 ? (
          <div className="section-card empty-state">
            <Sparkles className="mb-2 h-10 w-10 text-gray-600" />
            <p>Nenhuma regra criada.</p>
            <p className="empty-state-hint">
              Exemplo: descrições com “iFood” entram automaticamente em Alimentação.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rules.map((rule) => (
              <TransactionRuleCard
                key={rule.id}
                rule={{
                  id: rule.id,
                  keyword: rule.keyword,
                  kind: rule.kind,
                  isActive: rule.isActive,
                  category: rule.category,
                  financialAccount: rule.financialAccount,
                  appliedCount: rule._count.transactions,
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section className="section-card" aria-labelledby="history-title">
        <h2 id="history-title" className="text-lg font-semibold text-gray-100">
          Histórico de conciliações
        </h2>
        {reconciliations.length === 0 ? (
          <div className="empty-state min-h-48">
            <CheckCheck className="h-9 w-9 text-gray-600" />
            <p>Nenhuma conciliação concluída.</p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500">
                  <th className="pb-3 font-medium">Conta</th>
                  <th className="pb-3 font-medium">Data do extrato</th>
                  <th className="pb-3 font-medium text-right">Saldo conferido</th>
                  <th className="pb-3 font-medium text-right">Lançamentos</th>
                  <th className="pb-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {reconciliations.map((item) => (
                  <tr key={item.id} className="border-b border-gray-800/60">
                    <td className="py-4 text-gray-200">{item.financialAccount.name}</td>
                    <td className="py-4 text-gray-400">
                      {item.statementDate.toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                    </td>
                    <td className="py-4 text-right font-medium text-emerald-300">
                      {formatCurrency(item.statementBalance.toNumber())}
                    </td>
                    <td className="py-4 text-right text-gray-400">
                      {item.transactionCount}
                    </td>
                    <td className="py-4 text-right">
                      <UndoReconciliationButton
                        id={item.id}
                        accountName={item.financialAccount.name}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
