"use client";

import { useActionState, useEffect, useState } from "react";
import { createCategory, deleteCategory } from "@/app/actions/categories";
import { Trash2, X } from "lucide-react";

export function CategoryForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createCategory, null);

  useEffect(() => {
    if (state?.success) {
      queueMicrotask(() => setIsOpen(false));
    }
  }, [state]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) setIsOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isPending]);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="app-button app-button--primary"
      >
        + Nova Categoria
      </button>
    );
  }

  return (
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
        aria-labelledby="new-category-title"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-gray-800 px-5 py-4 sm:px-6">
          <h2 id="new-category-title" className="text-lg font-semibold text-gray-100">
            Nova Categoria
          </h2>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            disabled={isPending}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-100 disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={formAction} className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          {state?.error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
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

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
              className="app-button app-button--secondary w-full sm:w-auto"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="app-button app-button--primary w-full sm:w-auto"
            >
              {isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
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
