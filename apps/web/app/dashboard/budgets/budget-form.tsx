"use client";

import { useState, useTransition } from "react";
import { setBudget, deleteBudget } from "@/app/actions/budgets";

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
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Definir Orçamento</h2>
          <button onClick={onClose} className="modal-close" disabled={isPending}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label className="form-label">Categoria</label>
            <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl mb-4">
              <span className="text-2xl">{category.icon}</span>
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

          <div className="modal-footer">
            {currentBudget && (
              <button
                type="button"
                onClick={handleDelete}
                className="btn-danger"
                disabled={isPending}
              >
                Remover Orçamento
              </button>
            )}
            <div className="flex gap-3 ml-auto">
              <button type="button" onClick={onClose} className="btn-secondary" disabled={isPending}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={isPending}>
                {isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
