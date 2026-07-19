"use client";

import { undoAccountReconciliation } from "@/app/actions/reconciliation";
import { Undo2 } from "lucide-react";
import { useState } from "react";

export function UndoReconciliationButton({
  id,
  accountName,
}: {
  id: string;
  accountName: string;
}) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function handleUndo() {
    if (
      !confirm(
        `Desfazer a conciliação de “${accountName}”? Os lançamentos voltarão a ficar pendentes.`,
      )
    ) {
      return;
    }
    setError("");
    setIsPending(true);
    try {
      const result = await undoAccountReconciliation(id);
      if (result.error) setError(result.error);
    } catch {
      setError("Não foi possível desfazer.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error && <span className="text-xs text-red-300">{error}</span>}
      <button
        type="button"
        onClick={() => void handleUndo()}
        disabled={isPending}
        className="rounded-lg p-2 text-gray-500 hover:bg-amber-400/10 hover:text-amber-300 disabled:opacity-50"
        title="Desfazer conciliação"
      >
        <Undo2 className="h-4 w-4" />
        <span className="sr-only">Desfazer conciliação</span>
      </button>
    </div>
  );
}
