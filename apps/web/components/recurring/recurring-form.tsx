"use client";

import { useEffect, useState } from "react";
import {
  createRecurringTransaction,
  deleteRecurringTransaction,
  markRecurringTransactionPaid,
} from "@/app/actions/recurring";
import type { RecurrenceInterval, TransactionKind } from "@prisma/client";
import { Check, Plus, Trash2, X } from "lucide-react";

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

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) setIsOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSubmitting]);

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
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/80 px-4 backdrop-blur-sm sm:items-center"
          style={{
            paddingTop: "calc(1rem + env(safe-area-inset-top))",
            paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
          }}
        >
          <div
            className="my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-recurring-title"
          >
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-gray-800 px-5 py-4 sm:px-6">
              <h2 id="new-recurring-title" className="text-lg font-semibold text-gray-100 sm:text-xl">
                Nova Conta Recorrente
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-gray-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
              <div className="space-y-2">
                <label htmlFor="recurring-description" className="block text-sm font-medium text-gray-300">
                  Descrição
                </label>
                <input
                  id="recurring-description"
                  name="description"
                  required
                  placeholder="Ex: Conta de Luz"
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="recurring-amount" className="block text-sm font-medium text-gray-300">
                    Valor
                  </label>
                  <input
                    id="recurring-amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0,00"
                    className="form-input"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="recurring-kind" className="block text-sm font-medium text-gray-300">
                    Tipo
                  </label>
                  <select id="recurring-kind" name="kind" className="form-input">
                    <option value="EXPENSE">Despesa</option>
                    <option value="INCOME">Receita</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="recurring-category" className="block text-sm font-medium text-gray-300">
                    Categoria
                  </label>
                  <select id="recurring-category" name="categoryId" className="form-input">
                    <option value="">Sem Categoria</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="recurring-interval" className="block text-sm font-medium text-gray-300">
                    Intervalo
                  </label>
                  <select id="recurring-interval" name="interval" className="form-input">
                    <option value="MONTHLY">Mensal</option>
                    <option value="WEEKLY">Semanal</option>
                    <option value="DAILY">Diário</option>
                    <option value="YEARLY">Anual</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="recurring-start-date" className="block text-sm font-medium text-gray-300">
                  Primeiro vencimento
                </label>
                <input
                  id="recurring-start-date"
                  name="startDate"
                  type="date"
                  required
                  className="form-input"
                />
                <p className="text-xs leading-5 text-gray-500">
                  A transação só será criada quando você confirmar o pagamento.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                  className="app-button app-button--secondary w-full flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="app-button app-button--primary w-full flex-1"
                >
                  {isSubmitting ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
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

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) setIsOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSubmitting]);

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
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/80 px-4 backdrop-blur-sm sm:items-center"
          style={{
            paddingTop: "calc(1rem + env(safe-area-inset-top))",
            paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
          }}
        >
          <div
            className="my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`pay-recurring-${id}`}
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-800 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <h2 id={`pay-recurring-${id}`} className="text-lg font-semibold text-gray-100 sm:text-xl">
                  Confirmar pagamento
                </h2>
                <p className="mt-1 break-words text-sm text-gray-400">{description}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-gray-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
              <div className="space-y-2">
                <label
                  htmlFor={`recurring-amount-${id}`}
                  className="block text-sm font-medium text-gray-300"
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
                <p className="text-xs leading-5 text-gray-500">
                  Você pode ajustar o valor de contas variáveis, como água e luz.
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor={`recurring-account-${id}`}
                  className="block text-sm font-medium text-gray-300"
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

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                  className="app-button app-button--secondary w-full flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="app-button app-button--primary w-full flex-1"
                >
                  <Check className="h-4 w-4" />
                  {isSubmitting ? "Confirmando..." : "Confirmar"}
                </button>
              </div>
            </form>
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
