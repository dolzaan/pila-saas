import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { TransactionForm, DeleteTransactionButton } from "@/components/transactions/transaction-form";
import { Search } from "lucide-react";

export const metadata: Metadata = {
  title: "Transações — Pila",
  description: "Visualize e gerencie suas transações financeiras.",
};

export default async function TransactionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [transactions, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: session.user.id },
      orderBy: { occurredAt: "desc" },
      include: { category: true },
    }),
    prisma.category.findMany({
      where: {
        OR: [{ userId: null }, { userId: session.user.id }],
      },
      orderBy: [{ name: "asc" }],
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
          <TransactionForm categories={serializedCategories} />
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
                      {tx.description || "—"}
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
                    <td className={`py-4 text-right font-medium ${tx.kind === "INCOME" ? "text-emerald-400" : "text-gray-200"}`}>
                      {tx.kind === "INCOME" ? "+" : "-"} {formatCurrency(tx.amount.toNumber())}
                    </td>
                    <td className="py-4 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <TransactionForm
                          categories={serializedCategories}
                          transactionToEdit={{
                            id: tx.id,
                            amount: tx.amount.toNumber(),
                            kind: tx.kind,
                            description: tx.description,
                            categoryId: tx.categoryId,
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
