import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  Search,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  defaultDateForMonth,
  resolveMonthPeriod,
} from "@/lib/month-period";
import { MonthNavigator } from "@/components/dashboard/month-navigator";
import {
  DeleteTransactionButton,
  TransactionForm,
} from "@/components/transactions/transaction-form";

export const metadata: Metadata = {
  title: "Transações — Pila",
  description: "Visualize e gerencie suas transações financeiras.",
};

type TransactionSearchParams = {
  new?: string;
  onboarding?: string;
  month?: string;
  period?: string;
  type?: string;
  category?: string;
  account?: string;
  q?: string;
};

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<TransactionSearchParams>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const query = await searchParams;
  const period = resolveMonthPeriod(query.month);
  const allPeriods = query.period === "all";
  const kind = query.type === "EXPENSE" || query.type === "INCOME"
    ? query.type
    : undefined;
  const categoryId = query.category?.trim() || undefined;
  const financialAccountId = query.account?.trim() || undefined;
  const descriptionQuery = query.q?.trim().slice(0, 100) || undefined;

  const transactionWhere: Prisma.TransactionWhereInput = {
    userId: session.user.id,
    ...(!allPeriods && {
      occurredAt: { gte: period.start, lt: period.end },
    }),
    ...(kind && { kind }),
    ...(categoryId && { categoryId }),
    ...(financialAccountId && { financialAccountId }),
    ...(descriptionQuery && {
      description: { contains: descriptionQuery, mode: "insensitive" },
    }),
  };

  const [transactions, categories, financialAccounts] = await Promise.all([
    prisma.transaction.findMany({
      where: transactionWhere,
      orderBy: { occurredAt: "desc" },
      include: { category: true, financialAccount: true },
    }),
    prisma.category.findMany({
      where: {
        OR: [{ userId: null }, { userId: session.user.id }],
      },
      orderBy: [{ name: "asc" }],
    }),
    prisma.financialAccount.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isArchived: "asc" }, { name: "asc" }],
      select: { id: true, name: true, isArchived: true },
    }),
  ]);

  const serializedCategories = categories.map((category) => ({
    id: category.id,
    name: category.name,
    icon: category.icon,
    kind: category.kind,
  }));

  let totalIncome = 0;
  let totalExpense = 0;
  for (const transaction of transactions) {
    const amount = transaction.amount.toNumber();
    if (transaction.kind === "INCOME") totalIncome += amount;
    else totalExpense += amount;
  }

  const balance = totalIncome - totalExpense;
  const periodText = allPeriods ? "todos os períodos" : period.label.toLowerCase();
  const hasFilters = Boolean(kind || categoryId || financialAccountId || descriptionQuery);
  const navigatorQuery = {
    type: kind,
    category: categoryId,
    account: financialAccountId,
    q: descriptionQuery,
  };
  const clearFiltersParams = new URLSearchParams();
  if (allPeriods) clearFiltersParams.set("period", "all");
  else clearFiltersParams.set("month", period.key);

  const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-greeting">Transações</h1>
          <p className="dashboard-subtitle">
            Gerencie seus gastos e receitas de {periodText}.
          </p>
        </div>
        <TransactionForm
          categories={serializedCategories}
          financialAccounts={financialAccounts}
          openOnMount={query.new === "1"}
          onboardingMode={query.onboarding === "1"}
          defaultOccurredAt={defaultDateForMonth(period)}
          viewingPastMonth={!allPeriods && period.isPast}
        />
      </div>

      <div className="mb-6">
        <MonthNavigator
          pathname="/dashboard/transactions"
          selectedMonth={period.key}
          label={period.label}
          isCurrent={period.isCurrent}
          allPeriods={allPeriods}
          allowAllPeriods
          queryParams={navigatorQuery}
        />
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-card--balance">
          <div className="stat-card-header">
            <span className="stat-label">Saldo exibido</span>
            <Wallet className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="stat-value">{formatCurrency(balance)}</div>
          <div className="stat-footer">{transactions.length} lançamento(s) na seleção</div>
        </div>
        <div className="stat-card stat-card--expense">
          <div className="stat-card-header">
            <span className="stat-label">Despesas</span>
            <TrendingDown className="h-5 w-5 text-red-400" />
          </div>
          <div className="stat-value text-red-400">{formatCurrency(totalExpense)}</div>
          <div className="stat-footer">Em {periodText}</div>
        </div>
        <div className="stat-card stat-card--income">
          <div className="stat-card-header">
            <span className="stat-label">Receitas</span>
            <TrendingUp className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="stat-value text-emerald-400">{formatCurrency(totalIncome)}</div>
          <div className="stat-footer">Em {periodText}</div>
        </div>
      </div>

      <section className="section-card mb-6" aria-labelledby="transaction-filters-title">
        <div className="mb-4 flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-emerald-300" />
          <h2 id="transaction-filters-title" className="text-sm font-semibold">
            Filtros
          </h2>
        </div>
        <form action="/dashboard/transactions" className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {allPeriods ? (
            <input type="hidden" name="period" value="all" />
          ) : (
            <input type="hidden" name="month" value={period.key} />
          )}
          <label className="grid gap-1 text-xs text-gray-400">
            Buscar descrição
            <input
              type="search"
              name="q"
              defaultValue={descriptionQuery}
              placeholder="Ex.: mercado"
              className="form-input"
            />
          </label>
          <label className="grid gap-1 text-xs text-gray-400">
            Tipo
            <select name="type" defaultValue={kind || ""} className="form-input">
              <option value="">Receitas e despesas</option>
              <option value="EXPENSE">Somente despesas</option>
              <option value="INCOME">Somente receitas</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs text-gray-400">
            Categoria
            <select name="category" defaultValue={categoryId || ""} className="form-input">
              <option value="">Todas as categorias</option>
              {serializedCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-gray-400">
            Conta ou cartão
            <select name="account" defaultValue={financialAccountId || ""} className="form-input">
              <option value="">Todas as contas</option>
              {financialAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}{account.isArchived ? " (arquivada)" : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button type="submit" className="app-button app-button--primary flex-1">
              Aplicar filtros
            </button>
            {hasFilters && (
              <Link
                href={`/dashboard/transactions?${clearFiltersParams.toString()}`}
                className="app-button app-button--secondary"
              >
                Limpar
              </Link>
            )}
          </div>
        </form>
      </section>

      <div className="section-card">
        {transactions.length === 0 ? (
          <div className="empty-state">
            <Search className="mx-auto mb-4 h-12 w-12 text-gray-600" />
            <p>Nenhuma transação encontrada em {periodText}.</p>
            <p className="empty-state-hint">
              {hasFilters
                ? "Tente remover algum filtro ou consultar outro período."
                : "Adicione uma transação manualmente ou escolha outro mês."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:hidden" aria-label="Lista de transações">
              {transactions.map((transaction) => (
                <article
                  key={transaction.id}
                  className="rounded-2xl border border-white/8 bg-white/[0.025] p-4"
                >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-100">
                      {transaction.description || "Sem descrição"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {transaction.occurredAt.toLocaleDateString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                      })}
                      {transaction.category ? ` · ${transaction.category.icon} ${transaction.category.name}` : ""}
                    </p>
                  </div>
                  <p className={`shrink-0 text-sm font-bold ${transaction.kind === "INCOME" ? "text-emerald-400" : "text-gray-100"}`}>
                    {transaction.kind === "INCOME" ? "+" : "-"} {formatCurrency(transaction.amount.toNumber())}
                  </p>
                </div>

                <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 text-xs">
                  {transaction.financialAccount?.name && (
                    <span className="max-w-full truncate rounded-full bg-white/5 px-2.5 py-1 text-gray-400">
                      {transaction.financialAccount.name}
                    </span>
                  )}
                  {transaction.reconciliationId ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Conferida
                    </span>
                  ) : transaction.financialAccountId ? (
                    <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-amber-300">Pendente</span>
                  ) : null}
                  {transaction.appliedRuleId && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-400/10 px-2.5 py-1 text-indigo-300">
                      <Sparkles className="h-3 w-3" /> Regra automática
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-end gap-2 border-t border-white/5 pt-3">
                  <TransactionForm
                    categories={serializedCategories}
                    financialAccounts={financialAccounts}
                    transactionToEdit={{
                      id: transaction.id,
                      amount: transaction.amount.toNumber(),
                      kind: transaction.kind,
                      description: transaction.description,
                      categoryId: transaction.categoryId,
                      financialAccountId: transaction.financialAccountId,
                      occurredAt: transaction.occurredAt,
                    }}
                  />
                  <DeleteTransactionButton id={transaction.id} />
                </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-800 text-sm text-gray-500">
                  <th className="pb-3 font-medium">Data</th>
                  <th className="pb-3 font-medium">Descrição</th>
                  <th className="pb-3 font-medium">Categoria</th>
                  <th className="pb-3 font-medium">Conta</th>
                  <th className="pb-3 font-medium">Conciliação</th>
                  <th className="pb-3 text-right font-medium">Valor</th>
                  <th className="pb-3 text-center font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-800/50 transition-colors hover:bg-gray-800/20">
                    <td className="py-4 text-gray-400">
                      {transaction.occurredAt.toLocaleDateString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                      })}
                    </td>
                    <td className="py-4 text-gray-200">
                      <span>{transaction.description || "—"}</span>
                      {transaction.appliedRuleId && (
                        <span className="mt-1 flex items-center gap-1 text-[11px] text-indigo-300">
                          <Sparkles className="h-3 w-3" />
                          Regra automática
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-gray-400">
                      {transaction.category ? (
                        <span className="flex items-center gap-2">
                          <span>{transaction.category.icon}</span>
                          <span>{transaction.category.name}</span>
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-4 text-gray-400">
                      {transaction.financialAccount?.name || "—"}
                    </td>
                    <td className="py-4 text-gray-400">
                      {transaction.reconciliationId ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-1 text-xs text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Conferida
                        </span>
                      ) : transaction.financialAccountId ? (
                        <span className="text-xs text-amber-300">Pendente</span>
                      ) : "—"}
                    </td>
                    <td className={`py-4 text-right font-medium ${transaction.kind === "INCOME" ? "text-emerald-400" : "text-gray-200"}`}>
                      {transaction.kind === "INCOME" ? "+" : "-"} {formatCurrency(transaction.amount.toNumber())}
                    </td>
                    <td className="py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <TransactionForm
                          categories={serializedCategories}
                          financialAccounts={financialAccounts}
                          transactionToEdit={{
                            id: transaction.id,
                            amount: transaction.amount.toNumber(),
                            kind: transaction.kind,
                            description: transaction.description,
                            categoryId: transaction.categoryId,
                            financialAccountId: transaction.financialAccountId,
                            occurredAt: transaction.occurredAt,
                          }}
                        />
                        <DeleteTransactionButton id={transaction.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
