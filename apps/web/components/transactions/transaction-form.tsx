"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createTransaction, updateTransaction, deleteTransaction } from "@/app/actions/transactions";
import { Pencil, Trash2 } from "lucide-react";

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
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const action = transactionToEdit 
    ? updateTransaction.bind(null, transactionToEdit.id) 
    : createTransaction;
    
  const [state, formAction, isPending] = useActionState(action, null);

  const [selectedKind, setSelectedKind] = useState<"EXPENSE" | "INCOME">(
    transactionToEdit?.kind || "EXPENSE"
  );

  useEffect(() => {
    if (state?.success) {
      setIsOpen(false);
    }
  }, [state]);

  const filteredCategories = categories.filter((c) => c.kind === selectedKind);
  const isExpense = selectedKind === "EXPENSE";

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" 
        onClick={() => setIsOpen(false)} 
      />
      
      {/* Modal */}
      <div className="relative bg-[#0d1117] border border-gray-800 rounded-3xl w-[92vw] sm:w-[480px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        
        <div className="px-5 sm:px-6 py-4 flex justify-between items-center border-b border-gray-800/50">
          <h2 className="text-lg font-bold text-white">
            {transactionToEdit ? "Editar Transação" : "Nova Transação"}
          </h2>
          <button 
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-white p-2 rounded-full hover:bg-gray-800 transition-colors"
          >
            ✕
          </button>
        </div>
        
        <form action={formAction} className="flex flex-col flex-1 overflow-hidden">
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
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
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
                  step="0.01"
                  min="0.01"
                  required
                  defaultValue={transactionToEdit?.amount}
                  placeholder="0,00"
                  className="bg-transparent text-4xl font-bold w-40 text-center focus:outline-none placeholder:text-gray-700 text-white"
                  style={{ MozAppearance: 'textfield' }}
                />
              </div>
              {state?.details?.amount && (
                <p className="text-red-400 text-xs mt-1.5">{state.details.amount._errors.join(", ")}</p>
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
              className="px-5 py-2.5 rounded-xl text-gray-400 text-sm font-medium hover:bg-gray-800 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={`px-7 py-2.5 text-white text-sm rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:scale-105 active:scale-95 ${
                isExpense ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
              }`}
            >
              {isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {!transactionToEdit ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20 whitespace-nowrap"
        >
          + Nova Transação
        </button>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="text-gray-400 hover:text-emerald-400 transition-colors p-2 hover:bg-gray-800 rounded-lg"
          title="Editar"
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}

      {isOpen && mounted && createPortal(modalContent, document.body)}
    </>
  );
}

export function DeleteTransactionButton({ id }: { id: string }) {
  const [isPending, setIsPending] = useState(false);

  const handleDelete = async () => {
    if (confirm("Tem certeza que deseja excluir esta transação?")) {
      setIsPending(true);
      await deleteTransaction(id);
      setIsPending(false);
    }
  };

  return (
    <button 
      onClick={handleDelete}
      disabled={isPending}
      className="text-gray-500 hover:text-red-400 p-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
      title="Excluir"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
