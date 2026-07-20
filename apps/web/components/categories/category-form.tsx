"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createCategory, deleteCategory } from "@/app/actions/categories";
import { Trash2 } from "lucide-react";

export function CategoryForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createCategory, null);

  useEffect(() => {
    if (state?.success) {
      queueMicrotask(() => setIsOpen(false));
    }
  }, [state]);

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      <div
        className="relative flex max-h-[90vh] w-[92vw] flex-col overflow-hidden rounded-3xl border border-gray-800 bg-[#0d1117] shadow-2xl animate-in fade-in zoom-in-95 duration-150 sm:w-[480px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-category-title"
      >
        <div className="flex items-center justify-between border-b border-gray-800/50 px-5 py-4 sm:px-6">
          <h2 id="new-category-title" className="text-lg font-bold text-white">
            Nova Categoria
          </h2>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            disabled={isPending}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-800 hover:text-white disabled:opacity-50"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <form action={formAction} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
            {state?.error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
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
                className="form-input"
              />
              {state?.details?.name && (
                <p className="text-xs text-red-400">{state.details.name._errors.join(", ")}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  className="form-input"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="kind" className="block text-sm font-medium text-gray-300">
                  Tipo
                </label>
                <select id="kind" name="kind" required className="form-input">
                  <option value="EXPENSE">Despesa</option>
                  <option value="INCOME">Receita</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-800 bg-gray-900/50 p-4 sm:p-5">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
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
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="app-button app-button--primary"
      >
        + Nova Categoria
      </button>

      {isOpen && typeof document !== "undefined" && createPortal(modalContent, document.body)}
    </>
  );
}

export function DeleteCategoryButton({ id }: { id: string }) {
  const [isPending, setIsPending] = useState(false);

  const handleDelete = async () => {
    if (confirm("Tem certeza que deseja excluir esta categoria?")) {
      setIsPending(true);
      await deleteCategory(id);
      setIsPending(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-md transition-colors disabled:opacity-50"
      title="Excluir categoria"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
