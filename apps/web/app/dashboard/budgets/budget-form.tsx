"use client";

import { useState, useTransition } from "react";
import { setBudget, deleteBudget } from "@/app/actions/budgets";
import { BudgetModal } from "./budget-modal";

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface Budget {
  categoryId: string;
  monthlyLimit: number;
}

interface BudgetFormProps {
  category: Category;
  currentBudget?: Budget;
  onClose: () => void;
}

export function BudgetForm({ category, currentBudget, onClose }: BudgetFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(
    currentBudget?.monthlyLimit ? currentBudget.monthlyLimit.toString() : ""
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Por favor, insira um valor válido.");
      return;
    }

    startTransition(async () => {
      try {
        await setBudget(category.id, numericAmount);
        onClose();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro inesperado.";
        setError(message);
      }
    });
  }

  async function handleDelete() {
    startTransition(async () => {
      try {
        await deleteBudget(category.id);
        onClose();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro inesperado.";
        setError(message);
      }
    });
  }

  return (
    <BudgetModal
      title={currentBudget ? "Editar orçamento" : "Definir orçamento"}
      description="Informe o limite mensal para acompanhar os gastos desta categoria."
      onClose={onClose}
      closeDisabled={isPending}
    >
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
        <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="form-group">
            <label className="form-label">Categoria</label>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
              <span className="text-2xl" aria-hidden="true">{category.icon}</span>
              <span className="text-white font-medium">{category.name}</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="amount" className="form-label">Limite Mensal (R$)</label>
            <input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="form-input"
              placeholder="0.00"
              required
              disabled={isPending}
            />
          </div>

          {error && <div className="form-error">{error}</div>}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
          {currentBudget && (
            <button
              type="button"
              onClick={handleDelete}
              className="app-button app-button--danger"
              disabled={isPending}
            >
              Remover orçamento
            </button>
          )}
          <div className="flex flex-col-reverse gap-3 sm:ml-auto sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="app-button app-button--secondary"
              disabled={isPending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="app-button app-button--primary"
              disabled={isPending}
            >
              {isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </form>
    </BudgetModal>
  );
}
