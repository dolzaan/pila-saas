import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { RecurringForm, DeleteRecurringButton } from "@/components/recurring/recurring-form";

export const metadata: Metadata = {
  title: "Contas Recorrentes — Pila",
  description: "Gerencie suas contas fixas e receitas recorrentes.",
};

const intervalMap: Record<string, string> = {
  DAILY: "Diário",
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
  YEARLY: "Anual",
};

export default async function RecurringPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [recurringTransactions, categories] = await Promise.all([
    prisma.recurringTransaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
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
          <h1 className="dashboard-greeting">Contas Recorrentes</h1>
          <p className="dashboard-subtitle">
            Gerencie assinaturas, contas fixas e receitas recorrentes.
          </p>
        </div>
        <div>
          <RecurringForm categories={serializedCategories} />
        </div>
      </div>

      <div className="section-card mt-6">
        {recurringTransactions.length === 0 ? (
          <div className="empty-state">
            <CalendarDays className="w-12 h-12 text-gray-600 mb-4 mx-auto" />
            <p>Nenhuma conta recorrente cadastrada.</p>
            <p className="empty-state-hint">
              Adicione contas como luz, internet ou Netflix para gerar lançamentos automáticos.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-sm text-gray-500">
                  <th className="pb-3 font-medium">Descrição</th>
                  <th className="pb-3 font-medium">Categoria</th>
                  <th className="pb-3 font-medium">Frequência</th>
                  <th className="pb-3 font-medium text-right">Valor</th>
                  <th className="pb-3 font-medium">Próximo Venc.</th>
                  <th className="pb-3 font-medium text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {recurringTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
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
                    <td className="py-4 text-gray-400">
                      {intervalMap[tx.interval]}
                    </td>
                    <td className={`py-4 text-right font-medium ${tx.kind === "INCOME" ? "text-emerald-400" : "text-gray-200"}`}>
                      {tx.kind === "INCOME" ? "+" : "-"} {formatCurrency(tx.amount.toNumber())}
                    </td>
                    <td className="py-4 text-gray-400">
                      {tx.nextDate.toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-4 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <DeleteRecurringButton id={tx.id} />
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
