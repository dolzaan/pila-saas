"use client";

import { useState } from "react";
import { createRecurringTransaction, deleteRecurringTransaction } from "@/app/actions/recurring";
import type { RecurrenceInterval, TransactionKind } from "@prisma/client";
import { Plus, Trash2 } from "lucide-react";
import {
  AccessibleModal,
  ConfirmationDialog,
} from "@/components/ui/accessible-modal";
import { useDashboardFeedback } from "@/components/ui/dashboard-feedback";

type CategoryOption = {
  id: string;
  name: string;
  icon: string;
  kind: string;
};

export function RecurringForm({ categories }: { categories: CategoryOption[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { notify } = useDashboardFeedback();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
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
      notify("Conta fixa criada com sucesso.", "success");
    } catch (error) {
      console.error(error);
      notify("Não foi possível criar a conta fixa.", "error");
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
        <Plus className="w-4 h-4" aria-hidden="true" />
        Nova Conta Fixa
      </button>

      <AccessibleModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Nova conta recorrente"
        description="Cadastre uma receita ou despesa que se repete automaticamente."
      >
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="recurring-description" className="block text-sm font-medium text-gray-400 mb-1">
              Descrição
            </label>
            <input
              id="recurring-description"
              name="description"
              required
              placeholder="Ex: Conta de Luz"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5"
              data-autofocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="recurring-amount" className="block text-sm font-medium text-gray-400 mb-1">
                Valor
              </label>
              <input
                id="recurring-amount"
                name="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                required
                placeholder="0,00"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5"
              />
            </div>

            <div>
              <label htmlFor="recurring-kind" className="block text-sm font-medium text-gray-400 mb-1">
                Tipo
              </label>
              <select
                id="recurring-kind"
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
              <label htmlFor="recurring-category" className="block text-sm font-medium text-gray-400 mb-1">
                Categoria
              </label>
              <select
                id="recurring-category"
                name="categoryId"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5"
              >
                <option value="">Sem Categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="recurring-interval" className="block text-sm font-medium text-gray-400 mb-1">
                Intervalo
              </label>
              <select
                id="recurring-interval"
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
            <label htmlFor="recurring-start-date" className="block text-sm font-medium text-gray-400 mb-1">
              Data de início
            </label>
            <input
              id="recurring-start-date"
              name="startDate"
              type="date"
              required
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5"
            />
          </div>

          <div className="modal-actions px-0 pb-0">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="app-button app-button--secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="app-button app-button--primary"
            >
              {isSubmitting ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </AccessibleModal>
    </>
  );
}

export function DeleteRecurringButton({ id }: { id: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const { notify } = useDashboardFeedback();

  async function handleDelete() {
    setIsDeleting(true);

    try {
      await deleteRecurringTransaction(id);
      setIsConfirmOpen(false);
      notify("Conta fixa excluída com sucesso.", "success");
    } catch {
      notify("Não foi possível excluir a conta fixa.", "error");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsConfirmOpen(true)}
        disabled={isDeleting}
        className="icon-button icon-button--danger"
        title="Excluir conta fixa"
        aria-label="Excluir conta fixa"
      >
        <Trash2 className="w-4 h-4" aria-hidden="true" />
      </button>

      <ConfirmationDialog
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        isPending={isDeleting}
        title="Excluir conta fixa?"
        description="As transações já geradas serão mantidas. Apenas os próximos lançamentos automáticos serão interrompidos."
        confirmLabel="Excluir conta fixa"
      />
    </>
  );
}
