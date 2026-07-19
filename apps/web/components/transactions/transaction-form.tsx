"use client";

import { useActionState, useEffect, useState } from "react";
import { createTransaction, updateTransaction, deleteTransaction } from "@/app/actions/transactions";
import { Pencil, Trash2 } from "lucide-react";
import {
  AccessibleModal,
  ConfirmationDialog,
} from "@/components/ui/accessible-modal";
import { useDashboardFeedback } from "@/components/ui/dashboard-feedback";

type Category = {
  id: string;
  name: string;
  icon: string;
  kind: "EXPENSE" | "INCOME";
};

type TransactionFormProps = {
  categories: Category[];
  transactionToEdit?: {
    id: string;
    amount: number;
    kind: "EXPENSE" | "INCOME";
    description: string | null;
    categoryId: string | null;
    occurredAt: Date;
  };
};

export function TransactionForm({ categories, transactionToEdit }: TransactionFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { notify } = useDashboardFeedback();
  const action = transactionToEdit 
    ? updateTransaction.bind(null, transactionToEdit.id) 
    : createTransaction;
    
  const [state, formAction, isPending] = useActionState(action, null);

  const [selectedKind, setSelectedKind] = useState<"EXPENSE" | "INCOME">(
    transactionToEdit?.kind || "EXPENSE"
  );

  useEffect(() => {
    if (state?.success) {
      queueMicrotask(() => {
        setIsOpen(false);
        notify(
          transactionToEdit ? "Transação atualizada com sucesso." : "Transação criada com sucesso.",
          "success"
        );
      });
    }
  }, [state, notify, transactionToEdit]);

  const filteredCategories = categories.filter((c) => c.kind === selectedKind);
  const isExpense = selectedKind === "EXPENSE";

  const modalContent = (
    <AccessibleModal
      open={isOpen}
      onClose={() => setIsOpen(false)}
      title={transactionToEdit ? "Editar transação" : "Nova transação"}
      description="Informe o valor, o tipo e os detalhes do lançamento."
      size="md"
    >
      <form action={formAction} className="flex flex-col max-h-[calc(90vh-82px)] overflow-hidden">
          {/* Tabs Receita / Despesa */}
          <div className="px-5 sm:px-6 pt-5 mb-4">
            <div className="flex p-1 bg-gray-900/80 rounded-2xl border border-gray-800/60">
              <input type="hidden" name="kind" value={selectedKind} />
              <button
                type="button"
                onClick={() => setSelectedKind("EXPENSE")}
                className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${
                  isExpense 
                    ? "bg-red-500/10 text-red-500 shadow-sm" 
                    : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
                }`}
              >
                Despesa
              </button>
              <button
                type="button"
                onClick={() => setSelectedKind("INCOME")}
                className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${
                  !isExpense 
                    ? "bg-emerald-500/10 text-emerald-500 shadow-sm" 
                    : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
                }`}
              >
                Receita
              </button>
            </div>
          </div>

          <div className="px-5 sm:px-6 pb-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
            {state?.error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
                role="alert"
              >
                {state.error}
              </div>
            )}

            {/* Valor Gigante */}
            <div className="flex flex-col items-center justify-center py-2">
              <label htmlFor="amount" className="text-xs font-medium text-gray-400 mb-1">Valor da transação</label>
              <div className="flex items-center justify-center">
                <span className={`text-xl font-medium mr-1.5 transition-colors ${isExpense ? "text-red-500" : "text-emerald-500"}`}>R$</span>
                <input 
                  id="amount"
                  name="amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  required
                  defaultValue={transactionToEdit?.amount}
                  placeholder="0,00"
                  className="bg-transparent text-4xl font-bold w-40 text-center focus:outline-none placeholder:text-gray-700 text-white"
                  style={{ MozAppearance: 'textfield' }}
                  aria-invalid={Boolean(state?.details?.amount)}
                  aria-describedby={state?.details?.amount ? "transaction-amount-error" : undefined}
                  data-autofocus
                />
              </div>
              {state?.details?.amount && (
                <p id="transaction-amount-error" className="text-red-400 text-xs mt-1.5">{state.details.amount._errors.join(", ")}</p>
              )}
            </div>

            {/* Outros campos */}
            <div className="space-y-4 bg-gray-900/50 p-4 sm:p-5 rounded-2xl border border-gray-800/50">
              
              <div className="space-y-1">
                <label htmlFor="description" className="block text-[10px] font-semibold tracking-wide text-gray-400 uppercase">
                  Descrição
                </label>
                <input 
                  id="description"
                  name="description"
                  type="text" 
                  defaultValue={transactionToEdit?.description || ""}
                  placeholder="Ex: Almoço, Salário, etc..."
                  className="w-full bg-transparent border-b border-gray-700 py-2 text-sm text-gray-100 focus:outline-none focus:border-white transition-colors placeholder:text-gray-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <label htmlFor="categoryId" className="block text-[10px] font-semibold tracking-wide text-gray-400 uppercase">
                    Categoria
                  </label>
                  <select 
                    id="categoryId"
                    name="categoryId"
                    defaultValue={transactionToEdit?.categoryId || ""}
                    className="w-full bg-transparent border-b border-gray-700 py-2 text-sm text-gray-100 focus:outline-none focus:border-white transition-colors appearance-none cursor-pointer"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%239CA3AF\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundPosition: 'right center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em' }}
                  >
                    <option value="" className="bg-gray-900">Sem categoria</option>
                    {filteredCategories.map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-gray-900">
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="occurredAt" className="block text-[10px] font-semibold tracking-wide text-gray-400 uppercase">
                    Data
                  </label>
                  <input 
                    id="occurredAt"
                    name="occurredAt"
                    type="date"
                    required
                    defaultValue={
                      transactionToEdit 
                        ? new Date(transactionToEdit.occurredAt).toISOString().split('T')[0]
                        : new Date().toISOString().split('T')[0]
                    }
                    className="w-full bg-transparent border-b border-gray-700 py-2 text-sm text-gray-100 focus:outline-none focus:border-white transition-colors [color-scheme:dark] cursor-pointer"
                  />
                </div>
              </div>

            </div>

          </div>

          <div className="p-4 sm:p-5 bg-gray-900/50 border-t border-gray-800 flex justify-end gap-3">
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
    </AccessibleModal>
  );

  return (
    <>
      {!transactionToEdit ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="app-button app-button--primary"
        >
          + Nova Transação
        </button>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="icon-button"
          title="Editar transação"
          aria-label="Editar transação"
        >
          <Pencil className="w-4 h-4" aria-hidden="true" />
        </button>
      )}

      {modalContent}
    </>
  );
}

export function DeleteTransactionButton({ id }: { id: string }) {
  const [isPending, setIsPending] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const { notify } = useDashboardFeedback();

  async function handleDelete() {
    setIsPending(true);

    try {
      await deleteTransaction(id);
      setIsConfirmOpen(false);
      notify("Transação excluída com sucesso.", "success");
    } catch {
      notify("Não foi possível excluir a transação.", "error");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsConfirmOpen(true)}
        disabled={isPending}
        className="icon-button icon-button--danger"
        title="Excluir transação"
        aria-label="Excluir transação"
      >
        <Trash2 className="w-4 h-4" aria-hidden="true" />
      </button>

      <ConfirmationDialog
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        isPending={isPending}
        title="Excluir transação?"
        description="Esta ação é permanente e removerá a transação dos seus relatórios e totais."
        confirmLabel="Excluir transação"
      />
    </>
  );
}
