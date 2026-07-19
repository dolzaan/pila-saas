"use client";

import { useActionState, useEffect, useState } from "react";
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

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="app-button app-button--primary"
      >
        + Nova Categoria
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-100">Nova Categoria</h2>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        
        <form action={formAction} className="p-6 space-y-4">
          {state?.error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
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
            />
            {state?.details?.name && (
              <p className="text-red-400 text-xs">{state.details.name._errors.join(", ")}</p>
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

          <div className="pt-4 flex justify-end gap-3">
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
