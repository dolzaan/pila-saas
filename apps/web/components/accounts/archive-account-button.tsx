"use client";

import { setFinancialAccountArchived } from "@/app/actions/financial-accounts";
import { Archive, ArchiveRestore } from "lucide-react";
import { useState } from "react";

export function ArchiveAccountButton({
  id,
  isArchived,
}: {
  id: string;
  isArchived: boolean;
}) {
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    const message = isArchived
      ? "Deseja reativar esta conta?"
      : "Deseja arquivar esta conta? As transações existentes serão mantidas.";
    if (!confirm(message)) return;

    setIsPending(true);
    try {
      const result = await setFinancialAccountArchived(id, !isArchived);
      if (result.error) {
        alert(result.error);
        setIsPending(false);
      }
    } catch {
      alert("Não foi possível atualizar a conta.");
      setIsPending(false);
    }
  }

  const Icon = isArchived ? ArchiveRestore : Archive;
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-white/5 hover:text-emerald-300 disabled:opacity-50"
      title={isArchived ? "Reativar conta" : "Arquivar conta"}
    >
      <Icon className="h-4 w-4" />
      <span className="sr-only">{isArchived ? "Reativar conta" : "Arquivar conta"}</span>
    </button>
  );
}
