import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { TransactionForm, DeleteTransactionButton } from "@/components/transactions/transaction-form";
import { CheckCircle2, Search, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Transações — Pila",
  description: "Visualize e gerencie suas transações financeiras.",
};

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; onboarding?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const query = await searchParams;

  const [transactions, categories, financialAccounts] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: session.user.id },
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

  const serializedCategories = categories.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    kind: c.kind,
  }));

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header flex justify-between items-center">
        <div>
          <h1 className="dashboard-greeting">Transações</h1>
          <p className="dashboard-subtitle">
            Gerencie seus gastos e receitas.
          </p>
        </div>
        <div>
          <TransactionForm
            categories={serializedCategories}
            financialAccounts={financialAccounts}
            openOnMount={query.new === "1"}
            onboardingMode={query.onboarding === "1"}
          />
        </div>
      </div>

      <div className="section-card mt-6">
        {transactions.length === 0 ? (
          <div className="empty-state">
            <Search className="w-12 h-12 text-gray-600 mb-4 mx-auto" />
            <p>Nenhuma transação ainda.</p>
            <p className="empty-state-hint">
              Adicione transações manualmente para começar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-sm text-gray-500">
                  <th className="pb-3 font-medium">Data</th>
                  <th className="pb-3 font-medium">Descrição</th>
                  <th className="pb-3 font-medium">Categoria</th>
                  <th className="pb-3 font-medium">Conta</th>
                  <th className="pb-3 font-medium">Conciliação</th>
                  <th className="pb-3 font-medium text-right">Valor</th>
                  <th className="pb-3 font-medium text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                    <td className="py-4 text-gray-400">
                      {tx.occurredAt.toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-4 text-gray-200">
                      <span>{tx.description || "—"}</span>
                      {tx.appliedRuleId && (
                        <span className="mt-1 flex items-center gap-1 text-[11px] text-indigo-300">
                          <Sparkles className="h-3 w-3" />
                          Regra automática
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-gray-400">
                      {tx.category ? (
                        <span className="flex items-center gap-2">
                          <span>{tx.category.icon}</span>
                          <span>{tx.category.name}</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-4 text-gray-400">
                      {tx.financialAccount?.name || "—"}
                    </td>
                    <td className="py-4 text-gray-400">
                      {tx.reconciliationId ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-1 text-xs text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Conferida
                        </span>
                      ) : tx.financialAccountId ? (
                        <span className="text-xs text-amber-300">Pendente</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={`py-4 text-right font-medium ${tx.kind === "INCOME" ? "text-emerald-400" : "text-gray-200"}`}>
                      {tx.kind === "INCOME" ? "+" : "-"} {formatCurrency(tx.amount.toNumber())}
                    </td>
                    <td className="py-4 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <TransactionForm
                          categories={serializedCategories}
                          financialAccounts={financialAccounts}
                          transactionToEdit={{
                            id: tx.id,
                            amount: tx.amount.toNumber(),
                            kind: tx.kind,
                            description: tx.description,
                            categoryId: tx.categoryId,
                            financialAccountId: tx.financialAccountId,
                            occurredAt: tx.occurredAt,
                          }}
                        />
                        <DeleteTransactionButton id={tx.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
