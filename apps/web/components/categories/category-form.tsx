"use client";

import { useActionState, useEffect, useState } from "react";
import { createCategory, deleteCategory } from "@/app/actions/categories";
import { Trash2 } from "lucide-react";
import {
  AccessibleModal,
  ConfirmationDialog,
} from "@/components/ui/accessible-modal";
import { useDashboardFeedback } from "@/components/ui/dashboard-feedback";

export function CategoryForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createCategory, null);
  const { notify } = useDashboardFeedback();

  useEffect(() => {
    if (state?.success) {
      queueMicrotask(() => {
        setIsOpen(false);
        notify("Categoria criada com sucesso.", "success");
      });
    }
  }, [state, notify]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="app-button app-button--primary"
      >
        + Nova Categoria
      </button>

      <AccessibleModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Nova categoria"
        description="Crie uma categoria para organizar receitas ou despesas."
      >
        <form action={formAction} className="p-6 space-y-4">
          {state?.error && (
            <div
              className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm"
              role="alert"
            >
              {state.error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-300">
              Nome da categoria
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="Ex: Livros"
              className="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              aria-invalid={Boolean(state?.details?.name)}
              aria-describedby={state?.details?.name ? "category-name-error" : undefined}
              data-autofocus
            />
            {state?.details?.name && (
              <p id="category-name-error" className="text-red-400 text-xs">
                {state.details.name._errors.join(", ")}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="icon" className="block text-sm font-medium text-gray-300">
                Ícone (Emoji)
              </label>
              <input
                id="icon"
                name="icon"
                type="text"
                required
                maxLength={2}
                placeholder="Ex: 📚"
                className="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="kind" className="block text-sm font-medium text-gray-300">
                Tipo
              </label>
              <select
                id="kind"
                name="kind"
                required
                className="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="EXPENSE">Despesa</option>
                <option value="INCOME">Receita</option>
              </select>
            </div>
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
              disabled={isPending}
              className="app-button app-button--primary"
            >
              {isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </AccessibleModal>
    </>
  );
}

export function DeleteCategoryButton({ id }: { id: string }) {
  const [isPending, setIsPending] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const { notify } = useDashboardFeedback();

  async function handleDelete() {
    setIsPending(true);

    try {
      await deleteCategory(id);
      setIsConfirmOpen(false);
      notify("Categoria excluída com sucesso.", "success");
    } catch {
      notify("Não foi possível excluir a categoria.", "error");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsConfirmOpen(true)}
        disabled={isPending}
        className="icon-button icon-button--danger"
        title="Excluir categoria"
        aria-label="Excluir categoria"
      >
        <Trash2 className="w-4 h-4" aria-hidden="true" />
      </button>

      <ConfirmationDialog
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        isPending={isPending}
        title="Excluir categoria?"
        description="As transações associadas não serão apagadas, mas poderão ficar sem categoria."
        confirmLabel="Excluir categoria"
      />
    </>
  );
}
