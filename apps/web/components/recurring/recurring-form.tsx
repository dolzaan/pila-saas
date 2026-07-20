"use client";

import { useState } from "react";
import {
  createRecurringTransaction,
  deleteRecurringTransaction,
  markRecurringTransactionPaid,
} from "@/app/actions/recurring";
import type { RecurrenceInterval, TransactionKind } from "@prisma/client";
import { Check, Plus, Trash2 } from "lucide-react";

type CategoryOption = {
  id: string;
  name: string;
  icon: string;
  kind: string;
};

export type RecurringAccountOption = {
  id: string;
  name: string;
};

export function RecurringForm({ categories }: { categories: CategoryOption[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const amountStr = formData.get("amount") as string;
    const amount = parseFloat(amountStr.replace(",", "."));

    const data = {
      description: formData.get("description") as string,
      amount,
      kind: formData.get("kind") as TransactionKind,
      categoryId: (formData.get("categoryId") as string) || undefined,
      interval: formData.get("interval") as RecurrenceInterval,
      startDate: new Date(formData.get("startDate") as string),
    };

    try {
      await createRecurringTransaction(data);
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      alert("Erro ao criar transação recorrente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="app-button app-button--primary"
      >
        <Plus className="w-4 h-4" />
        Nova Conta Fixa
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Nova Conta Recorrente</h2>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-white"
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Descrição
                  </label>
                  <input
                    name="description"
                    required
                    placeholder="Ex: Conta de Luz"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Valor
                    </label>
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0,00"
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Tipo
                    </label>
                    <select
                      name="kind"
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5"
                    >
                      <option value="EXPENSE">Despesa</option>
                      <option value="INCOME">Receita</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Categoria
                    </label>
                    <select
                      name="categoryId"
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5"
                    >
                      <option value="">Sem Categoria</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Intervalo
                    </label>
                    <select
                      name="interval"
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5"
                    >
                      <option value="MONTHLY">Mensal</option>
                      <option value="WEEKLY">Semanal</option>
                      <option value="DAILY">Diário</option>
                      <option value="YEARLY">Anual</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Primeiro vencimento
                  </label>
                  <input
                    name="startDate"
                    type="date"
                    required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    A transação só será criada quando você confirmar o pagamento.
                  </p>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 app-button app-button--secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 app-button app-button--primary"
                  >
                    {isSubmitting ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function PayRecurringButton({
  id,
  description,
  amount,
  expectedDueDate,
  accounts,
}: {
  id: string;
  description: string;
  amount: number;
  expectedDueDate: string;
  accounts: RecurringAccountOption[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await markRecurringTransactionPaid(
        id,
        expectedDueDate,
        new FormData(event.currentTarget),
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      setIsOpen(false);
    } catch (submissionError) {
      console.error(submissionError);
      setError("Não foi possível confirmar o pagamento.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setIsOpen(true);
        }}
        className="app-button app-button--primary app-button--compact"
        title="Confirmar pagamento"
      >
        <Check className="h-4 w-4" />
        Pagar
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div
            className="w-full max-w-md overflow-hidden rounded-xl border border-gray-800 bg-gray-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`pay-recurring-${id}`}
          >
            <div className="p-6">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 id={`pay-recurring-${id}`} className="text-xl font-bold">
                    Confirmar pagamento
                  </h2>
                  <p className="mt-1 text-sm text-gray-400">{description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-white"
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor={`recurring-amount-${id}`}
                    className="mb-1 block text-sm font-medium text-gray-400"
                  >
                    Valor pago
                  </label>
                  <input
                    id={`recurring-amount-${id}`}
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="1000000000"
                    required
                    defaultValue={amount.toFixed(2)}
                    className="form-input"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Você pode ajustar o valor de contas variáveis, como água e luz.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor={`recurring-account-${id}`}
                    className="mb-1 block text-sm font-medium text-gray-400"
                  >
                    Conta utilizada
                  </label>
                  <select
                    id={`recurring-account-${id}`}
                    name="financialAccountId"
                    className="form-input"
                    defaultValue=""
                  >
                    <option value="">Não vincular a uma conta</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    disabled={isSubmitting}
                    className="flex-1 app-button app-button--secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 app-button app-button--primary"
                  >
                    <Check className="h-4 w-4" />
                    {isSubmitting ? "Confirmando..." : "Confirmar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function DeleteRecurringButton({ id }: { id: string }) {
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        if (
          confirm(
            "Tem certeza que deseja excluir esta conta recorrente? As transações já geradas não serão apagadas.",
          )
        ) {
          setIsDeleting(true);
          try {
            await deleteRecurringTransaction(id);
          } catch {
            alert("Erro ao deletar.");
            setIsDeleting(false);
          }
        }
      }}
      disabled={isDeleting}
      className="p-2 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
      title="Excluir"
    >
      <Trash2 className="w-4 h-4" />
      <span className="sr-only">Excluir conta recorrente</span>
    </button>
  );
}
