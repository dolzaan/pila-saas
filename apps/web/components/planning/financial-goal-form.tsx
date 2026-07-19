"use client";

import {
  createFinancialGoal,
  updateFinancialGoal,
} from "@/app/actions/financial-goals";
import { reminderDateKey } from "@/lib/reminders";
import { Pencil, Plus, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { FinancialGoalItem } from "./types";

const ICONS = ["🎯", "🏠", "🚗", "✈️", "📚", "💻", "💍", "🛟"];

export function FinancialGoalForm({
  goalToEdit,
}: {
  goalToEdit?: FinancialGoalItem;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const action = goalToEdit
    ? updateFinancialGoal.bind(null, goalToEdit.id)
    : createFinancialGoal;
  const [state, formAction, isPending] = useActionState(action, null);

  useEffect(() => {
    if (state?.success) queueMicrotask(() => setIsOpen(false));
  }, [state]);

  const formId = goalToEdit?.id || "new";
  const modal = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar formulário"
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`goal-form-title-${formId}`}
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-gray-800 bg-[#0d1117] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-5">
          <div>
            <h2 id={`goal-form-title-${formId}`} className="text-lg font-bold text-white">
              {goalToEdit ? "Editar meta" : "Nova meta financeira"}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Dê um destino claro para o dinheiro que você quer guardar.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-800 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={formAction}>
          <div className="space-y-5 p-6">
            {state?.error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                {state.error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor={`goal-name-${formId}`} className="text-sm font-medium text-gray-300">
                Nome da meta
              </label>
              <input
                id={`goal-name-${formId}`}
                name="name"
                required
                maxLength={80}
                defaultValue={goalToEdit?.name}
                placeholder="Ex: Reserva de emergência"
                className="form-input"
              />
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-gray-300">Ícone</legend>
              <div className="grid grid-cols-8 gap-2">
                {ICONS.map((icon) => (
                  <label key={icon} className="cursor-pointer">
                    <input
                      type="radio"
                      name="icon"
                      value={icon}
                      defaultChecked={(goalToEdit?.icon || "🎯") === icon}
                      className="peer sr-only"
                    />
                    <span className="grid aspect-square place-items-center rounded-xl border border-white/10 bg-white/5 text-xl transition-colors peer-checked:border-emerald-400/60 peer-checked:bg-emerald-400/10">
                      {icon}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor={`goal-target-${formId}`} className="text-sm font-medium text-gray-300">
                  Valor da meta
                </label>
                <input
                  id={`goal-target-${formId}`}
                  name="targetAmount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  defaultValue={goalToEdit?.targetAmount}
                  placeholder="0,00"
                  className="form-input"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor={`goal-saved-${formId}`} className="text-sm font-medium text-gray-300">
                  Já guardado
                </label>
                <input
                  id={`goal-saved-${formId}`}
                  name="savedAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={goalToEdit?.savedAmount || 0}
                  className="form-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor={`goal-date-${formId}`} className="text-sm font-medium text-gray-300">
                Data desejada <span className="text-gray-600">(opcional)</span>
              </label>
              <input
                id={`goal-date-${formId}`}
                name="targetDate"
                type="date"
                defaultValue={
                  goalToEdit?.targetDate ? reminderDateKey(goalToEdit.targetDate) : ""
                }
                className="form-input [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-800 bg-gray-900/50 p-5">
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
              {isPending ? "Salvando..." : "Salvar meta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {goalToEdit ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-white/5 hover:text-emerald-300"
          title="Editar meta"
        >
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Editar meta</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="app-button app-button--primary"
        >
          <Plus className="h-4 w-4" />
          Nova meta
        </button>
      )}
      {isOpen && typeof document !== "undefined" && createPortal(modal, document.body)}
    </>
  );
}
