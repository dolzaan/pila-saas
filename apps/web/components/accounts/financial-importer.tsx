"use client";

import {
  confirmFinancialImport,
  previewFinancialImport,
} from "@/app/actions/financial-accounts";
import { CheckCircle2, FileSearch, Upload, XCircle } from "lucide-react";
import { useMemo, useState } from "react";

type AccountOption = {
  id: string;
  name: string;
};

type PreviewRow = {
  fingerprint: string;
  occurredAt: string;
  description: string;
  amount: number;
  kind: "EXPENSE" | "INCOME";
  sourceRow: number;
  duplicate: boolean;
  suggestedCategory: {
    id: string;
    name: string;
    icon: string;
    ruleKeyword: string;
  } | null;
};

type Preview = {
  format: "CSV" | "OFX";
  ignoredRows: number;
  rows: PreviewRow[];
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export function FinancialImporter({ accounts }: { accounts: AccountOption[] }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [fileName, setFileName] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const availableRows = useMemo(
    () => preview?.rows.filter((row) => !row.duplicate) || [],
    [preview],
  );

  function resetPreview() {
    setPreview(null);
    setSelected(new Set());
    setError("");
    setNotice("");
  }

  async function handleFile(file: File | undefined) {
    resetPreview();
    if (!file) {
      setFileName("");
      setContent("");
      return;
    }
    if (file.size > 1_000_000) {
      setError("O arquivo deve ter no máximo 1 MB.");
      return;
    }
    if (!/\.(csv|ofx|qfx)$/i.test(file.name)) {
      setError("Escolha um arquivo CSV, OFX ou QFX.");
      return;
    }

    setFileName(file.name);
    const bytes = await file.arrayBuffer();
    try {
      setContent(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    } catch {
      // Alguns bancos brasileiros ainda exportam CSV/OFX em Windows-1252.
      setContent(new TextDecoder("windows-1252").decode(bytes));
    }
  }

  async function handlePreview() {
    setError("");
    setNotice("");
    if (!accountId || !content || !fileName) {
      setError("Selecione uma conta e um arquivo para continuar.");
      return;
    }

    setIsPreviewing(true);
    try {
      const result = await previewFinancialImport({ accountId, fileName, content });
      if (!result.success || !result.rows || !result.format) {
        setError(result.error || "Não foi possível gerar a prévia.");
        return;
      }

      const nextPreview: Preview = {
        format: result.format,
        ignoredRows: result.ignoredRows || 0,
        rows: result.rows,
      };
      setPreview(nextPreview);
      setSelected(
        new Set(nextPreview.rows.filter((row) => !row.duplicate).map((row) => row.fingerprint)),
      );
    } catch {
      setError("Não foi possível enviar o arquivo para análise.");
    } finally {
      setIsPreviewing(false);
    }
  }

  function toggleRow(fingerprint: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(fingerprint)) next.delete(fingerprint);
      else next.add(fingerprint);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) =>
      current.size === availableRows.length
        ? new Set()
        : new Set(availableRows.map((row) => row.fingerprint)),
    );
  }

  async function handleImport() {
    setError("");
    setNotice("");
    if (selected.size === 0) {
      setError("Selecione ao menos uma transação nova.");
      return;
    }

    setIsImporting(true);
    try {
      const result = await confirmFinancialImport({
        accountId,
        fileName,
        content,
        selectedFingerprints: Array.from(selected),
      });

      if (!result.success) {
        setError(result.error || "Não foi possível importar as transações.");
        return;
      }

      setNotice(
        `${result.imported || 0} transação(ões) importada(s). ${
          result.skipped ? `${result.skipped} duplicada(s) ignorada(s).` : ""
        }`,
      );
      setPreview(null);
      setSelected(new Set());
      setFileName("");
      setContent("");
    } catch {
      setError("A importação foi interrompida. Tente novamente.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <section className="section-card" aria-labelledby="import-title">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <span className="dashboard-kicker text-emerald-400">Importação segura</span>
          <h2 id="import-title" className="text-lg font-semibold text-gray-100">
            Trazer extrato bancário
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Envie um CSV, OFX ou QFX. Você confere tudo antes de salvar e o Pila bloqueia
            lançamentos já importados.
          </p>
        </div>
        <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-3 text-xs text-gray-400">
          Até 500 transações · arquivo de até 1 MB
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-700 p-8 text-center">
          <Upload className="mx-auto mb-3 h-8 w-8 text-gray-600" />
          <p className="text-sm text-gray-400">Crie uma conta antes de importar um extrato.</p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(220px,0.7fr)_minmax(280px,1fr)_auto] lg:items-end">
            <div className="space-y-2">
              <label htmlFor="import-account" className="text-sm font-medium text-gray-300">
                Conta de destino
              </label>
              <select
                id="import-account"
                value={accountId}
                onChange={(event) => {
                  setAccountId(event.target.value);
                  resetPreview();
                }}
                className="form-input"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="statement-file" className="text-sm font-medium text-gray-300">
                Arquivo do banco
              </label>
              <input
                id="statement-file"
                type="file"
                accept=".csv,.ofx,.qfx,text/csv,application/x-ofx"
                onChange={(event) => void handleFile(event.target.files?.[0])}
                className="block w-full rounded-xl border border-gray-700 bg-gray-950/60 px-3 py-2 text-sm text-gray-400 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-gray-200 hover:file:bg-white/15"
              />
            </div>
            <button
              type="button"
              onClick={() => void handlePreview()}
              disabled={isPreviewing || !content}
              className="app-button app-button--secondary"
            >
              <FileSearch className="h-4 w-4" />
              {isPreviewing ? "Analisando..." : "Gerar prévia"}
            </button>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
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
            <div className="mt-6 overflow-hidden rounded-2xl border border-gray-800">
              <div className="flex flex-col gap-2 border-b border-gray-800 bg-gray-950/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-300">
                  {preview.rows.length} encontrada(s) · {availableRows.length} nova(s) ·{" "}
                  {preview.rows.length - availableRows.length} duplicada(s)
                </p>
                <p className="text-xs text-gray-500">
                  Formato {preview.format}
                  {preview.ignoredRows > 0 ? ` · ${preview.ignoredRows} linha(s) inválida(s)` : ""}
                </p>
              </div>
              <div className="max-h-[26rem] overflow-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="sticky top-0 bg-[#111827] text-xs text-gray-500">
                    <tr>
                      <th className="w-12 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={
                            availableRows.length > 0 && selected.size === availableRows.length
                          }
                          onChange={toggleAll}
                          aria-label="Selecionar todas as transações novas"
                          className="accent-emerald-400"
                        />
                      </th>
                      <th className="px-3 py-3 font-medium">Data</th>
                      <th className="px-3 py-3 font-medium">Descrição</th>
                      <th className="px-3 py-3 font-medium">Categoria sugerida</th>
                      <th className="px-3 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => (
                      <tr
                        key={`${row.fingerprint}-${row.sourceRow}`}
                        className="border-t border-gray-800/70"
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(row.fingerprint)}
                            disabled={row.duplicate}
                            onChange={() => toggleRow(row.fingerprint)}
                            aria-label={`Selecionar ${row.description}`}
                            className="accent-emerald-400 disabled:opacity-30"
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-gray-400">
                          {new Date(row.occurredAt).toLocaleDateString("pt-BR", {
                            timeZone: "UTC",
                          })}
                        </td>
                        <td className="max-w-xs truncate px-3 py-3 text-gray-200">
                          {row.description}
                        </td>
                        <td className="px-3 py-3 text-gray-400">
                          {row.suggestedCategory ? (
                            <span
                              title={`Regra: contém “${row.suggestedCategory.ruleKeyword}”`}
                              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-400/10 px-2 py-1 text-xs text-indigo-200"
                            >
                              {row.suggestedCategory.icon} {row.suggestedCategory.name}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              row.duplicate
                                ? "bg-amber-400/10 text-amber-300"
                                : "bg-emerald-400/10 text-emerald-300"
                            }`}
                          >
                            {row.duplicate ? "Já importada" : "Nova"}
                          </span>
                        </td>
                        <td
                          className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${
                            row.kind === "INCOME" ? "text-emerald-400" : "text-red-300"
                          }`}
                        >
                          {row.kind === "INCOME" ? "+" : "-"} {formatCurrency(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-3 border-t border-gray-800 bg-gray-950/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500">{selected.size} selecionada(s)</p>
                <button
                  type="button"
                  onClick={() => void handleImport()}
                  disabled={isImporting || selected.size === 0}
                  className="app-button app-button--primary"
                >
                  <Upload className="h-4 w-4" />
                  {isImporting ? "Importando..." : "Confirmar importação"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
