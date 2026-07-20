import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reminderDateKey, saoPauloDateKey } from "@/lib/reminders";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CalendarDays, CircleAlert, Clock3 } from "lucide-react";
import {
  DeleteRecurringButton,
  PayRecurringButton,
  RecurringForm,
} from "@/components/recurring/recurring-form";

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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

function recurringStatus(nextDate: Date) {
  const dueDate = reminderDateKey(nextDate);
  const today = saoPauloDateKey();
  if (dueDate < today) {
    return {
      label: "Vencida",
      className: "bg-red-400/10 text-red-300",
      icon: CircleAlert,
    };
  }
  if (dueDate === today) {
    return {
      label: "Vence hoje",
      className: "bg-amber-400/10 text-amber-300",
      icon: Clock3,
    };
  }
  return {
    label: "Agendada",
    className: "bg-indigo-400/10 text-indigo-300",
    icon: CalendarDays,
  };
}

export default async function RecurringPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [recurringTransactions, categories, financialAccounts] =
    await Promise.all([
      prisma.recurringTransaction.findMany({
        where: { userId: session.user.id },
        orderBy: [{ nextDate: "asc" }, { createdAt: "desc" }],
        include: { category: true },
      }),
      prisma.category.findMany({
        where: {
          OR: [{ userId: null }, { userId: session.user.id }],
        },
        orderBy: [{ name: "asc" }],
      }),
      prisma.financialAccount.findMany({
        where: { userId: session.user.id, isArchived: false },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

  const serializedCategories = categories.map((category) => ({
    id: category.id,
    name: category.name,
    icon: category.icon,
    kind: category.kind,
  }));
  const serializedAccounts = financialAccounts.map((account) => ({
    id: account.id,
    name: account.name,
  }));

  return (
    <div className="dashboard-page">
      <div className="dashboard-header flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="dashboard-greeting">Contas Recorrentes</h1>
          <p className="dashboard-subtitle">
            Confirme cada pagamento antes que ele afete seu saldo.
          </p>
        </div>
        <RecurringForm categories={serializedCategories} />
      </div>

      <section className="section-card mb-6 border-emerald-400/15 bg-emerald-400/5">
        <div className="flex items-start gap-3">
          <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
          <div>
            <h2 className="font-semibold text-gray-100">
              Pagamentos sob seu controle
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              O próximo vencimento fica pendente até você confirmar. Nesse
              momento, o Pila cria a transação e avança a conta para o próximo
              ciclo.
            </p>
          </div>
        </div>
      </section>

      <div className="section-card">
        {recurringTransactions.length === 0 ? (
          <div className="empty-state">
            <CalendarDays className="w-12 h-12 text-gray-600 mb-4 mx-auto" />
            <p>Nenhuma conta recorrente cadastrada.</p>
            <p className="empty-state-hint">
              Adicione contas como luz, internet ou Netflix e confirme cada
              pagamento quando ele acontecer.
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
                  <th className="pb-3 font-medium text-right">Valor previsto</th>
                  <th className="pb-3 font-medium">Próximo venc.</th>
                  <th className="pb-3 font-medium">Situação</th>
                  <th className="pb-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {recurringTransactions.map((transaction) => {
                  const status = recurringStatus(transaction.nextDate);
                  const StatusIcon = status.icon;
                  return (
                    <tr
                      key={transaction.id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors"
                    >
                      <td className="py-4 text-gray-200">
                        {transaction.description || "—"}
                      </td>
                      <td className="py-4 text-gray-400">
                        {transaction.category ? (
                          <span className="flex items-center gap-2">
                            <span>{transaction.category.icon}</span>
                            <span>{transaction.category.name}</span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-4 text-gray-400">
                        {intervalMap[transaction.interval]}
                      </td>
                      <td
                        className={`py-4 text-right font-medium ${
                          transaction.kind === "INCOME"
                            ? "text-emerald-400"
                            : "text-gray-200"
                        }`}
                      >
                        {transaction.kind === "INCOME" ? "+" : "-"}{" "}
                        {formatCurrency(transaction.amount.toNumber())}
                      </td>
                      <td className="py-4 text-gray-400">
                        {transaction.nextDate.toLocaleDateString("pt-BR", {
                          timeZone: "UTC",
                        })}
                      </td>
                      <td className="py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {status.label}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex justify-end items-center gap-2">
                          <PayRecurringButton
                            id={transaction.id}
                            description={
                              transaction.description || "Transação recorrente"
                            }
                            amount={transaction.amount.toNumber()}
                            expectedDueDate={transaction.nextDate.toISOString()}
                            accounts={serializedAccounts}
                          />
                          <DeleteRecurringButton id={transaction.id} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
