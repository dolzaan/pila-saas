"use client";

import { useMemo, useState } from "react";
import { BudgetForm } from "./budget-form";
import { Plus, X } from "lucide-react";

interface CategoryData {
  id: string;
  name: string;
  icon: string;
}

interface BudgetCardData {
  category: CategoryData;
  limit: number | undefined;
  spent: number;
  percentage: number;
}

export function BudgetClient({ data }: { data: BudgetCardData[] }) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryData | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<{ categoryId: string; monthlyLimit: number } | undefined>();
  const [isChoosingCategory, setIsChoosingCategory] = useState(false);

  const availableCategories = useMemo(
    () => data.filter((item) => !item.limit),
    [data],
  );

  function handleEdit(item: BudgetCardData) {
    setSelectedCategory(item.category);
    setSelectedBudget(item.limit ? { categoryId: item.category.id, monthlyLimit: item.limit } : undefined);
  }

  function handleCreate(category: CategoryData) {
    setSelectedCategory(category);
    setSelectedBudget(undefined);
    setIsChoosingCategory(false);
  }

  function closeBudgetForm() {
    setSelectedCategory(null);
    setSelectedBudget(undefined);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="section-title">Limites por categoria</h2>
          <p className="text-sm text-gray-400 mt-1">
            Crie limites mensais para acompanhar seus gastos antes de estourar o orçamento.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsChoosingCategory(true)}
          className="app-button app-button--primary"
          disabled={availableCategories.length === 0}
        >
          <Plus className="h-4 w-4" />
          {availableCategories.length === 0 ? "Todos definidos" : "Adicionar orçamento"}
        </button>
      </div>

      <div className="section-card space-y-6">
        {data.length === 0 ? (
          <div className="empty-state py-10">
            <p>Nenhuma categoria de despesa disponível.</p>
          </div>
        ) : (
          data.map((item) => (
            <div key={item.category.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
              <div className="flex items-center justify-between mb-4 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl">{item.category.icon}</span>
                  <div className="min-w-0">
                    <h3 className="text-white font-medium truncate">{item.category.name}</h3>
                    <p className="text-sm text-gray-400">
                      {item.limit
                        ? `Orçamento: R$ ${item.limit.toFixed(2)}`
                        : "Sem limite definido"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-lg font-bold ${
                    !item.limit ? "text-gray-400" :
                    item.percentage >= 100 ? "text-red-400" :
                    item.percentage >= 80 ? "text-yellow-400" :
                    "text-emerald-400"
                  }`}>
                    R$ {item.spent.toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleEdit(item)}
                    className="app-button app-button--secondary app-button--compact"
                  >
                    {item.limit ? "Editar" : "Definir orçamento"}
                  </button>
                </div>
              </div>

              {item.limit && (
                <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      item.percentage >= 100 ? "bg-red-500" :
                      item.percentage >= 80 ? "bg-yellow-400" :
                      "bg-emerald-400"
                    }`}
                    style={{ width: `${Math.min(item.percentage, 100)}%` }}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {isChoosingCategory && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Adicionar orçamento</h2>
                <p className="text-sm text-gray-400 mt-1">Escolha a categoria que receberá um limite mensal.</p>
              </div>
              <button type="button" onClick={() => setIsChoosingCategory(false)} className="modal-close" aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="modal-body space-y-2 max-h-[60vh] overflow-y-auto">
              {availableCategories.map((item) => (
                <button
                  type="button"
                  key={item.category.id}
                  onClick={() => handleCreate(item.category)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-left transition-colors"
                >
                  <span className="text-2xl">{item.category.icon}</span>
                  <span className="text-white font-medium">{item.category.name}</span>
                </button>
              ))}
              {availableCategories.length === 0 && (
                <p className="text-center text-gray-400 py-8">Todas as categorias já possuem orçamento.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedCategory && (
        <BudgetForm
          category={selectedCategory}
          currentBudget={selectedBudget}
          onClose={closeBudgetForm}
        />
      )}
    </div>
  );
}
