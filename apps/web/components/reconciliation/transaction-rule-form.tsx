"use client";

import { createTransactionRule } from "@/app/actions/transaction-rules";
import { Plus, Sparkles, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type CategoryOption = {
  id: string;
  name: string;
  icon: string;
  kind: "EXPENSE" | "INCOME";
};

type AccountOption = {
  id: string;
  name: string;
};

export function TransactionRuleForm({
  categories,
  accounts,
}: {
  categories: CategoryOption[];
  accounts: AccountOption[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createTransactionRule, null);

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
        aria-labelledby="transaction-rule-title"
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-gray-800 bg-[#0d1117] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-5">
          <div>
            <h2 id="transaction-rule-title" className="text-lg font-bold text-white">
              Nova regra automática
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Categorize lançamentos pela descrição recebida do banco.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-800 hover:text-white"
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
              <label htmlFor="rule-keyword" className="text-sm font-medium text-gray-300">
                Se a descrição contiver
              </label>
              <input
                id="rule-keyword"
                name="keyword"
                required
                minLength={2}
                maxLength={80}
                placeholder="Ex: iFood, Uber ou salário"
                className="form-input"
              />
              <p className="text-xs text-gray-600">
                A comparação ignora maiúsculas, minúsculas e acentos.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="rule-category" className="text-sm font-medium text-gray-300">
                Categorizar como
              </label>
              <select id="rule-category" name="categoryId" required className="form-input">
                <option value="">Escolha uma categoria</option>
                <optgroup label="Despesas">
                  {categories
                    .filter((category) => category.kind === "EXPENSE")
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Receitas">
                  {categories
                    .filter((category) => category.kind === "INCOME")
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="rule-account" className="text-sm font-medium text-gray-300">
                Vincular à conta <span className="text-gray-600">(opcional)</span>
              </label>
              <select id="rule-account" name="financialAccountId" className="form-input">
                <option value="">Manter a conta do lançamento</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <input
                type="checkbox"
                name="applyToExisting"
                className="mt-1 accent-emerald-400"
              />
              <span>
                <strong className="block text-sm text-gray-200">
                  Aplicar aos lançamentos antigos sem categoria
                </strong>
                <small className="mt-1 block text-xs text-gray-500">
                  O Pila atualiza apenas descrições compatíveis e ainda não categorizadas.
                </small>
              </span>
            </label>
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
              <Sparkles className="h-4 w-4" />
              {isPending ? "Criando..." : "Criar regra"}
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
        <Plus className="h-4 w-4" />
        Nova regra
      </button>
      {isOpen && typeof document !== "undefined" && createPortal(modal, document.body)}
    </>
  );
}
