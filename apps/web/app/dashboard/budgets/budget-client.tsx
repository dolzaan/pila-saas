"use client";

import { useState } from "react";
import { BudgetForm } from "./budget-form";

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
  const [selectedBudget, setSelectedBudget] = useState<{ categoryId: string, monthlyLimit: number } | undefined>();

  function handleEdit(item: BudgetCardData) {
    setSelectedCategory(item.category);
    setSelectedBudget(item.limit ? { categoryId: item.category.id, monthlyLimit: item.limit } : undefined);
  }

  return (
    <div className="section-card space-y-6">
      {data.map((item) => (
        <div key={item.category.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{item.category.icon}</span>
              <div>
                <h3 className="text-white font-medium">{item.category.name}</h3>
                <p className="text-sm text-gray-400">
                  {item.limit
                    ? `Orçamento: R$ ${item.limit.toFixed(2)}`
                    : "Sem limite definido"}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
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
                className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                {item.limit ? "Editar" : "Definir Orçamento"}
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
              ></div>
            </div>
          )}
        </div>
      ))}

      {selectedCategory && (
        <BudgetForm
          category={selectedCategory}
          currentBudget={selectedBudget}
          onClose={() => {
            setSelectedCategory(null);
            setSelectedBudget(undefined);
          }}
        />
      )}
    </div>
  );
}
