"use client";

import { registerBenefitRecharge } from "@/app/actions/financial-accounts";
import { CalendarDays, Plus, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type BenefitRechargeFormProps = {
  accountId: string;
  accountName: string;
  expectedAmount: number | null;
};

function todayInputValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function BenefitRechargeForm({
  accountId,
  accountName,
  expectedAmount,
}: BenefitRechargeFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(registerBenefitRecharge, null);

  useEffect(() => {
    if (state?.success) queueMicrotask(() => setIsOpen(false));
  }, [state]);

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Fechar formulário"
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="benefit-recharge-title"
        className="relative w-full rounded-t-3xl border border-gray-800 bg-[#0d1117] shadow-2xl sm:max-w-md sm:rounded-3xl"
      >
        <div className="flex items-start justify-between border-b border-gray-800 px-5 py-4 sm:px-6">
          <div>
            <h2 id="benefit-recharge-title" className="text-lg font-bold text-white">
              Registrar recarga
            </h2>
            <p className="mt-1 text-xs text-gray-500">{accountName}</p>
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
          <input type="hidden" name="accountId" value={accountId} />
          <div className="space-y-5 p-5 sm:p-6">
            {state?.error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                {state.error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor={`benefit-recharge-amount-${accountId}`} className="text-sm font-medium text-gray-300">
                Valor que entrou
              </label>
              <input
                id={`benefit-recharge-amount-${accountId}`}
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={expectedAmount || undefined}
                placeholder="0,00"
                required
                autoFocus
                className="form-input"
              />
              <p className="text-xs text-gray-500">
                Pode ser diferente da previsão mensal cadastrada.
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor={`benefit-recharge-date-${accountId}`} className="text-sm font-medium text-gray-300">
                Data da recarga
              </label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  id={`benefit-recharge-date-${accountId}`}
                  name="occurredAt"
                  type="date"
                  defaultValue={todayInputValue()}
                  required
                  className="form-input pl-10"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-800 bg-gray-900/50 p-5">
            <button type="button" onClick={() => setIsOpen(false)} className="app-button app-button--secondary">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="app-button app-button--primary">
              {isPending ? "Registrando..." : "Confirmar recarga"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className="app-button app-button--primary w-full justify-center sm:w-auto">
        <Plus className="h-4 w-4" />
        Registrar recarga
      </button>
      {isOpen && typeof document !== "undefined" && createPortal(modal, document.body)}
    </>
  );
}
