"use client";

import { createFinancialAccount } from "@/app/actions/financial-accounts";
import { Plus, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function FinancialAccountForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState("CHECKING");
  const [state, formAction, isPending] = useActionState(createFinancialAccount, null);

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
        aria-labelledby="financial-account-title"
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-gray-800 bg-[#0d1117] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-5">
          <div>
            <h2 id="financial-account-title" className="text-lg font-bold text-white">
              Nova conta ou cartão
            </h2>
            <p className="mt-1 text-xs text-gray-500">Organize de onde o dinheiro entra e sai.</p>
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

        <form action={formAction} className="overflow-y-auto">
          <div className="space-y-5 p-6">
            {state?.error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                {state.error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="account-name" className="text-sm font-medium text-gray-300">
                Nome
              </label>
              <input
                id="account-name"
                name="name"
                required
                maxLength={80}
                placeholder={type === "BENEFIT_CARD" ? "Ex: Vale alimentação" : "Ex: Nubank, Itaú ou Dinheiro"}
                className="form-input"
              />
              {state?.details?.name && (
                <p className="text-xs text-red-400">{state.details.name._errors.join(", ")}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="account-type" className="text-sm font-medium text-gray-300">
                Tipo
              </label>
              <select
                id="account-type"
                name="type"
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="form-input"
              >
                <option value="CHECKING">Conta corrente</option>
                <option value="SAVINGS">Poupança</option>
                <option value="CASH">Dinheiro</option>
                <option value="CREDIT_CARD">Cartão de crédito</option>
                <option value="BENEFIT_CARD">Cartão-benefício</option>
                <option value="INVESTMENT">Investimento</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>

            {type !== "CREDIT_CARD" ? (
              <div className="space-y-2">
                <label htmlFor="initial-balance" className="text-sm font-medium text-gray-300">
                  Saldo inicial
                </label>
                <input
                  id="initial-balance"
                  name="initialBalance"
                  type="number"
                  step="0.01"
                  defaultValue="0"
                  className="form-input"
                />
                <p className="text-xs text-gray-500">
                  Use o saldo atual se estiver começando a controlar esta conta hoje.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-4">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                  Dados do cartão
                </p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="credit-limit" className="text-sm font-medium text-gray-300">
                      Limite
                    </label>
                    <input
                      id="credit-limit"
                      name="creditLimit"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      placeholder="5000,00"
                      className="form-input"
                    />
                    {state?.details?.creditLimit && (
                      <p className="text-xs text-red-400">
                        {state.details.creditLimit._errors.join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="closing-day" className="text-sm font-medium text-gray-300">
                        Fechamento
                      </label>
                      <input
                        id="closing-day"
                        name="closingDay"
                        type="number"
                        min="1"
                        max="31"
                        required
                        placeholder="10"
                        className="form-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="due-day" className="text-sm font-medium text-gray-300">
                        Vencimento
                      </label>
                      <input
                        id="due-day"
                        name="dueDay"
                        type="number"
                        min="1"
                        max="31"
                        required
                        placeholder="17"
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {type === "BENEFIT_CARD" && (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">
                  Dados do benefício
                </p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="benefit-type" className="text-sm font-medium text-gray-300">
                      Tipo de benefício
                    </label>
                    <select id="benefit-type" name="benefitType" required className="form-input">
                      <option value="FOOD">Alimentação</option>
                      <option value="MEAL">Refeição</option>
                      <option value="MOBILITY">Mobilidade</option>
                      <option value="CULTURE">Cultura</option>
                      <option value="FLEXIBLE">Flexível</option>
                    </select>
                    {state?.details?.benefitType && (
                      <p className="text-xs text-red-400">
                        {state.details.benefitType._errors.join(", ")}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="expected-recharge" className="text-sm font-medium text-gray-300">
                        Recarga prevista
                      </label>
                      <input
                        id="expected-recharge"
                        name="expectedRecharge"
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="650,00"
                        className="form-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="recharge-day" className="text-sm font-medium text-gray-300">
                        Dia previsto
                      </label>
                      <input
                        id="recharge-day"
                        name="rechargeDay"
                        type="number"
                        min="1"
                        max="31"
                        placeholder="10"
                        className="form-input"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    A previsão é só informativa. Você registra o valor real sempre que a recarga cair.
                  </p>

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/5 bg-black/10 p-3">
                    <input
                      type="checkbox"
                      name="balanceCarriesOver"
                      defaultChecked
                      className="mt-0.5 h-4 w-4 accent-emerald-400"
                    />
                    <span>
                      <span className="block text-sm font-medium text-gray-300">Saldo acumula</span>
                      <span className="mt-0.5 block text-xs text-gray-500">
                        O valor que sobrar continua disponível no mês seguinte.
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            )}
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
              {isPending ? "Salvando..." : type === "BENEFIT_CARD" ? "Salvar benefício" : "Salvar conta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="app-button app-button--primary">
        <Plus className="h-4 w-4" />
        Nova conta ou cartão
      </button>
      {isOpen && typeof document !== "undefined" && createPortal(modal, document.body)}
    </>
  );
}
