"use client";

import {
  deleteTransactionRule,
  setTransactionRuleActive,
} from "@/app/actions/transaction-rules";
import { Power, Trash2 } from "lucide-react";
import { useState } from "react";

type TransactionRuleItem = {
  id: string;
  keyword: string;
  kind: "EXPENSE" | "INCOME";
  isActive: boolean;
  category: { name: string; icon: string };
  financialAccount: { name: string } | null;
  appliedCount: number;
};

export function TransactionRuleCard({ rule }: { rule: TransactionRuleItem }) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function run(action: () => Promise<{ error?: string }>) {
    setError("");
    setIsPending(true);
    try {
      const result = await action();
      if (result.error) setError(result.error);
    } catch {
      setError("Não foi possível atualizar a regra.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Excluir a regra “${rule.keyword}”?`)) return;
    await run(() => deleteTransactionRule(rule.id));
  }

  return (
    <article className={`section-card ${rule.isActive ? "" : "opacity-60"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                rule.kind === "INCOME"
                  ? "bg-emerald-400/10 text-emerald-300"
                  : "bg-red-400/10 text-red-300"
              }`}
            >
              {rule.kind === "INCOME" ? "Receita" : "Despesa"}
            </span>
            <span className="text-xs text-gray-600">
              {rule.appliedCount} aplicação(ões)
            </span>
          </div>
          <p className="mt-4 text-sm text-gray-500">Descrição contém</p>
          <h3 className="mt-1 truncate text-lg font-semibold text-white">
            “{rule.keyword}”
          </h3>
          <p className="mt-3 text-sm text-gray-300">
            {rule.category.icon} {rule.category.name}
          </p>
          {rule.financialAccount && (
            <p className="mt-1 text-xs text-gray-500">
              Conta: {rule.financialAccount.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void run(() => setTransactionRuleActive(rule.id, !rule.isActive))}
            disabled={isPending}
            className="rounded-lg p-2 text-gray-500 hover:bg-white/5 hover:text-emerald-300 disabled:opacity-50"
            title={rule.isActive ? "Pausar regra" : "Ativar regra"}
          >
            <Power className="h-4 w-4" />
            <span className="sr-only">{rule.isActive ? "Pausar regra" : "Ativar regra"}</span>
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={isPending}
            className="rounded-lg p-2 text-gray-500 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
            title="Excluir regra"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Excluir regra</span>
          </button>
        </div>
      </div>
      {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
    </article>
  );
}
