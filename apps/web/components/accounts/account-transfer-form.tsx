"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, X } from "lucide-react";
import { createAccountTransfer } from "@/app/actions/account-transfers";

type TransferAccount = {
  id: string;
  name: string;
};

type AccountTransferFormProps = {
  accounts: TransferAccount[];
};

export function AccountTransferForm({ accounts }: AccountTransferFormProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [sourceAccountId, setSourceAccountId] = useState(accounts[0]?.id || "");
  const [state, action, isPending] = useActionState(createAccountTransfer, null);

  const destinationAccounts = useMemo(
    () => accounts.filter((account) => account.id !== sourceAccountId),
    [accounts, sourceAccountId],
  );

  useEffect(() => {
    if (!state?.success) return;
    queueMicrotask(() => {
      setIsOpen(false);
      router.refresh();
    });
  }, [router, state]);

  if (accounts.length < 2) {
    return null;
  }

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-md"
        onClick={() => setIsOpen(false)}
        aria-label="Fechar transferência"
      />

      <div
        className="relative flex max-h-[90vh] w-[92vw] max-w-[480px] flex-col overflow-hidden rounded-3xl border border-gray-800 bg-[#0d1117] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-transfer-title"
      >
        <div className="flex items-center justify-between border-b border-gray-800/50 px-5 py-4 sm:px-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300">
              Movimentação entre contas
            </span>
            <h2 id="account-transfer-title" className="mt-1 text-lg font-bold text-white">
              Nova transferência
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-800 hover:text-white"
            aria-label="Fechar formulário"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={action} className="flex flex-1 flex-col overflow-hidden">
          <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 text-sm text-gray-300">
              A transferência altera apenas o saldo das contas. Ela não entra como receita nem despesa nos relatórios.
            </div>

            {state?.error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                {state.error}
              </div>
            )}

            <div className="flex flex-col items-center justify-center py-2">
              <label htmlFor="transferAmount" className="mb-1 text-xs font-medium text-gray-400">
                Valor da transferência
              </label>
              <div className="flex items-center justify-center">
                <span className="mr-1.5 text-xl font-medium text-emerald-400">R$</span>
                <input
                  id="transferAmount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0,00"
                  className="w-40 bg-transparent text-center text-4xl font-bold text-white placeholder:text-gray-700 focus:outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-5 rounded-2xl border border-gray-800/50 bg-gray-900/50 p-4 sm:p-5">
              <div className="space-y-1">
                <label htmlFor="sourceAccountId" className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Sai da conta
                </label>
                <select
                  id="sourceAccountId"
                  name="sourceAccountId"
                  value={sourceAccountId}
                  onChange={(event) => setSourceAccountId(event.target.value)}
                  required
                  className="w-full cursor-pointer appearance-none border-b border-gray-700 bg-transparent py-2 text-sm text-gray-100 focus:border-white focus:outline-none"
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id} className="bg-gray-900">
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-center text-gray-600">
                <ArrowRightLeft className="h-5 w-5 rotate-90" />
              </div>

              <div className="space-y-1">
                <label htmlFor="destinationAccountId" className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Entra na conta
                </label>
                <select
                  id="destinationAccountId"
                  name="destinationAccountId"
                  required
                  defaultValue={destinationAccounts[0]?.id}
                  key={sourceAccountId}
                  className="w-full cursor-pointer appearance-none border-b border-gray-700 bg-transparent py-2 text-sm text-gray-100 focus:border-white focus:outline-none"
                >
                  {destinationAccounts.map((account) => (
                    <option key={account.id} value={account.id} className="bg-gray-900">
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="transferDescription" className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    Descrição
                  </label>
                  <input
                    id="transferDescription"
                    name="description"
                    type="text"
                    maxLength={255}
                    placeholder="Ex: Reserva do mês"
                    className="w-full border-b border-gray-700 bg-transparent py-2 text-sm text-gray-100 placeholder:text-gray-600 focus:border-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="transferOccurredAt" className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    Data
                  </label>
                  <input
                    id="transferOccurredAt"
                    name="occurredAt"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="w-full cursor-pointer border-b border-gray-700 bg-transparent py-2 text-sm text-gray-100 [color-scheme:dark] focus:border-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-800 bg-gray-900/50 p-4 sm:p-5">
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
              {isPending ? "Transferindo..." : "Transferir"}
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
        className="app-button app-button--secondary"
      >
        <ArrowRightLeft className="h-4 w-4" />
        Transferir
      </button>
      {isOpen && typeof document !== "undefined" && createPortal(modal, document.body)}
    </>
  );
}
