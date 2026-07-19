"use client";

import {
  changeFinancialGoalAmount,
  deleteFinancialGoal,
} from "@/app/actions/financial-goals";
import { CalendarDays, CheckCircle2, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { FinancialGoalForm } from "./financial-goal-form";
import type { FinancialGoalItem } from "./types";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

function monthlyContribution(goal: FinancialGoalItem) {
  if (!goal.targetDate || goal.completedAt) return null;
  const today = new Date();
  const target = new Date(goal.targetDate);
  const months = Math.max(
    1,
    (target.getUTCFullYear() - today.getUTCFullYear()) * 12 +
      target.getUTCMonth() -
      today.getUTCMonth(),
  );
  return Math.max(0, goal.targetAmount - goal.savedAmount) / months;
}

export function FinancialGoalCard({ goal }: { goal: FinancialGoalItem }) {
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [state, formAction, isPending] = useActionState(
    changeFinancialGoalAmount.bind(null, goal.id),
    null,
  );
  const progress = Math.min(100, (goal.savedAmount / goal.targetAmount) * 100);
  const contribution = monthlyContribution(goal);

  async function handleDelete() {
    if (!confirm(`Excluir a meta “${goal.name}”?`)) return;
    setDeleteError("");
    setIsDeleting(true);
    try {
      const result = await deleteFinancialGoal(goal.id);
      if (result.error) setDeleteError(result.error);
    } catch {
      setDeleteError("Não foi possível excluir a meta.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <article className="section-card relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-indigo-400" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-2xl">
            {goal.icon}
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-gray-100">{goal.name}</h3>
            <p className="text-xs text-gray-500">
              {goal.completedAt ? "Meta concluída" : `${progress.toFixed(0)}% alcançado`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <FinancialGoalForm goalToEdit={goal} />
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={isDeleting}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
            title="Excluir meta"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Excluir meta</span>
          </button>
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-gray-500">Guardado</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {formatCurrency(goal.savedAmount)}
          </p>
        </div>
        <p className="text-sm text-gray-500">de {formatCurrency(goal.targetAmount)}</p>
      </div>
      <div
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/5"
        role="progressbar"
        aria-label={`Progresso da meta ${goal.name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-indigo-400"
          style={{ width: `${progress}%` }}
        />
      </div>

      {goal.targetDate && (
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
          <CalendarDays className="h-4 w-4" />
          Prazo:{" "}
          {new Date(goal.targetDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
          {contribution !== null && (
            <span className="ml-auto text-emerald-300">
              {formatCurrency(contribution)}/mês
            </span>
          )}
        </div>
      )}

      {goal.completedAt ? (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          Objetivo alcançado. Parabéns!
        </div>
      ) : (
        <form action={formAction} className="mt-5 flex flex-col gap-2 sm:flex-row">
          <label htmlFor={`goal-amount-${goal.id}`} className="sr-only">
            Valor do aporte ou retirada
          </label>
          <input
            id={`goal-amount-${goal.id}`}
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            placeholder="Valor"
            className="form-input min-w-0 flex-1"
          />
          <button
            type="submit"
            name="operation"
            value="DEPOSIT"
            disabled={isPending}
            className="app-button app-button--primary app-button--compact"
          >
            Aportar
          </button>
          {goal.savedAmount > 0 && (
            <button
              type="submit"
              name="operation"
              value="WITHDRAW"
              disabled={isPending}
              className="app-button app-button--secondary app-button--compact"
            >
              Retirar
            </button>
          )}
        </form>
      )}

      {(state?.error || deleteError) && (
        <p className="mt-3 text-xs text-red-300">{state?.error || deleteError}</p>
      )}
    </article>
  );
}
