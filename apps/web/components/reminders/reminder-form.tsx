"use client";

import {
  createBillReminder,
  updateBillReminder,
} from "@/app/actions/reminders";
import { reminderDateKey, saoPauloDateKey } from "@/lib/reminders";
import { Pencil, Plus, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ReminderItem } from "./types";

export function ReminderForm({ reminderToEdit }: { reminderToEdit?: ReminderItem }) {
  const [isOpen, setIsOpen] = useState(false);
  const action = reminderToEdit
    ? updateBillReminder.bind(null, reminderToEdit.id)
    : createBillReminder;
  const [state, formAction, isPending] = useActionState(action, null);

  useEffect(() => {
    if (state?.success) queueMicrotask(() => setIsOpen(false));
  }, [state]);

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
        aria-labelledby={`reminder-form-title-${reminderToEdit?.id || "new"}`}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-gray-800 bg-[#0d1117] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-5">
          <div>
            <h2
              id={`reminder-form-title-${reminderToEdit?.id || "new"}`}
              className="text-lg font-bold text-white"
            >
              {reminderToEdit ? "Editar lembrete" : "Novo lembrete"}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              O aviso será enviado pelo WhatsApp na data escolhida.
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
              <label htmlFor={`reminder-description-${reminderToEdit?.id || "new"}`} className="text-sm font-medium text-gray-300">
                Conta ou compromisso
              </label>
              <input
                id={`reminder-description-${reminderToEdit?.id || "new"}`}
                name="description"
                required
                maxLength={120}
                defaultValue={reminderToEdit?.description}
                placeholder="Ex: Aluguel, internet ou IPVA"
                className="form-input"
              />
              {state?.details?.description && (
                <p className="text-xs text-red-400">
                  {state.details.description._errors.join(", ")}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor={`reminder-amount-${reminderToEdit?.id || "new"}`} className="text-sm font-medium text-gray-300">
                  Valor
                </label>
                <input
                  id={`reminder-amount-${reminderToEdit?.id || "new"}`}
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  defaultValue={reminderToEdit?.amount}
                  placeholder="0,00"
                  className="form-input"
                />
                {state?.details?.amount && (
                  <p className="text-xs text-red-400">
                    {state.details.amount._errors.join(", ")}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor={`reminder-date-${reminderToEdit?.id || "new"}`} className="text-sm font-medium text-gray-300">
                  Vencimento
                </label>
                <input
                  id={`reminder-date-${reminderToEdit?.id || "new"}`}
                  name="dueDate"
                  type="date"
                  required
                  defaultValue={
                    reminderToEdit ? reminderDateKey(reminderToEdit.dueDate) : saoPauloDateKey()
                  }
                  className="form-input [color-scheme:dark]"
                />
                {state?.details?.dueDate && (
                  <p className="text-xs text-red-400">
                    {state.details.dueDate._errors.join(", ")}
                  </p>
                )}
              </div>
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
            <button type="submit" disabled={isPending} className="app-button app-button--primary">
              {isPending ? "Salvando..." : "Salvar lembrete"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {reminderToEdit ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-white/5 hover:text-emerald-300"
          title="Editar lembrete"
        >
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Editar lembrete</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="app-button app-button--primary"
        >
          <Plus className="h-4 w-4" />
          Novo lembrete
        </button>
      )}
      {isOpen && typeof document !== "undefined" && createPortal(modal, document.body)}
    </>
  );
}
