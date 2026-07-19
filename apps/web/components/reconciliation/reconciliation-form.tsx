"use client";

import {
  confirmAccountReconciliation,
  previewAccountReconciliation,
} from "@/app/actions/reconciliation";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  RefreshCcw,
} from "lucide-react";
import { useState } from "react";

type AccountOption = {
  id: string;
  name: string;
  type: string;
  unreconciledCount: number;
};

type ReconciliationPreview = {
  accountId: string;
  accountName: string;
  accountType: string;
  statementBalance: number;
  systemBalance: number;
  difference: number;
  balanced: boolean;
  unreconciledCount: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export function ReconciliationForm({
  accounts,
  defaultDate,
}: {
  accounts: AccountOption[];
  defaultDate: string;
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [statementDate, setStatementDate] = useState(defaultDate);
  const [statementBalance, setStatementBalance] = useState("");
  const [preview, setPreview] = useState<ReconciliationPreview | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  function input() {
    return {
      accountId,
      statementDate,
      statementBalance: Number(statementBalance.replace(",", ".")),
    };
  }

  function resetResult() {
    setPreview(null);
    setError("");
    setNotice("");
  }

  async function handlePreview() {
    setError("");
    setNotice("");
    setIsPreviewing(true);
    try {
      const result = await previewAccountReconciliation(input());
      if ("error" in result) {
        setPreview(null);
        setError(result.error || "Não foi possível calcular a conciliação.");
        return;
      }
      setPreview(result);
    } catch {
      setError("Não foi possível calcular a conciliação.");
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleConfirm() {
    setError("");
    setNotice("");
    setIsConfirming(true);
    try {
      const result = await confirmAccountReconciliation(input());
      if ("error" in result) {
        setError(result.error || "Não foi possível concluir a conciliação.");
        return;
      }
      setNotice(
        `${result.accountName}: ${result.reconciled} lançamento(s) conciliado(s).`,
      );
      setPreview(null);
      setStatementBalance("");
    } catch {
      setError("Não foi possível concluir a conciliação.");
    } finally {
      setIsConfirming(false);
    }
  }

  if (accounts.length === 0) {
    return (
      <div className="empty-state min-h-64">
        <RefreshCcw className="h-10 w-10 text-gray-600" />
        <p>Cadastre uma conta antes de conciliar.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_180px_minmax(180px,0.8fr)_auto] lg:items-end">
        <div className="space-y-2">
          <label htmlFor="reconciliation-account" className="text-sm font-medium text-gray-300">
            Conta ou cartão
          </label>
          <select
            id="reconciliation-account"
            value={accountId}
            onChange={(event) => {
              setAccountId(event.target.value);
              resetResult();
            }}
            className="form-input"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} · {account.unreconciledCount} pendente(s)
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="statement-date" className="text-sm font-medium text-gray-300">
            Data do extrato
          </label>
          <input
            id="statement-date"
            type="date"
            value={statementDate}
            max={defaultDate}
            onChange={(event) => {
              setStatementDate(event.target.value);
              resetResult();
            }}
            className="form-input [color-scheme:dark]"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="statement-balance" className="text-sm font-medium text-gray-300">
            Saldo no banco
          </label>
          <input
            id="statement-balance"
            type="number"
            step="0.01"
            value={statementBalance}
            onChange={(event) => {
              setStatementBalance(event.target.value);
              resetResult();
            }}
            placeholder="0,00"
            className="form-input"
          />
        </div>
        <button
          type="button"
          onClick={() => void handlePreview()}
          disabled={isPreviewing || !accountId || !statementDate || !statementBalance}
          className="app-button app-button--secondary"
        >
          <Calculator className="h-4 w-4" />
          {isPreviewing ? "Calculando..." : "Comparar saldos"}
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {notice && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {notice}
        </div>
      )}

      {preview && (
        <div
          className={`mt-6 rounded-2xl border p-5 ${
            preview.balanced
              ? "border-emerald-400/25 bg-emerald-400/5"
              : "border-amber-400/25 bg-amber-400/5"
          }`}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-gray-500">Saldo no Pila</p>
              <p className="mt-1 text-xl font-bold text-white">
                {formatCurrency(preview.systemBalance)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Saldo no banco</p>
              <p className="mt-1 text-xl font-bold text-white">
                {formatCurrency(preview.statementBalance)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Diferença</p>
              <p
                className={`mt-1 text-xl font-bold ${
                  preview.balanced ? "text-emerald-300" : "text-amber-300"
                }`}
              >
                {formatCurrency(preview.difference)}
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-4 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 text-sm">
              {preview.balanced ? (
                <>
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <p className="text-gray-300">
                    Os saldos conferem. {preview.unreconciledCount} lançamento(s) serão
                    vinculados a esta conciliação.
                  </p>
                </>
              ) : (
                <>
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <p className="text-gray-300">
                    Revise lançamentos ausentes, duplicados ou com valor incorreto antes
                    de confirmar.
                  </p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={!preview.balanced || isConfirming}
              className="app-button app-button--primary"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isConfirming ? "Conciliando..." : "Confirmar conciliação"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
