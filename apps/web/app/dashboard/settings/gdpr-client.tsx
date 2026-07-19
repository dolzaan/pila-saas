"use client";

import { useTransition, useState } from "react";
import { exportUserData, deleteUserAccount } from "@/app/actions/gdpr";
import { signOut } from "next-auth/react";

export function GdprClient() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleExport() {
    startTransition(async () => {
      try {
        const data = await exportUserData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "meus_dados_finzap.json";
        a.click();
        URL.revokeObjectURL(url);
        setMessage("✅ Dados exportados com sucesso!");
      } catch (e) {
        const message = e instanceof Error ? e.message : "Erro inesperado.";
        setMessage(`❌ Erro: ${message}`);
      }
    });
  }

  function handleDelete() {
    if (!window.confirm("ATENÇÃO: Tem certeza que deseja excluir sua conta e perder TODOS os seus dados? Esta ação é irreversível.")) {
      return;
    }
    
    startTransition(async () => {
      try {
        await deleteUserAccount();
        await signOut({ callbackUrl: "/register" });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Erro inesperado.";
        setMessage(`❌ Erro ao excluir: ${message}`);
      }
    });
  }

  return (
    <div className="space-y-4">
      {message && <div className="text-sm text-gray-300 bg-white/5 p-3 rounded">{message}</div>}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleExport}
          disabled={isPending}
          className="app-button app-button--secondary"
        >
          {isPending ? "Processando..." : "Baixar meus dados (JSON)"}
        </button>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="app-button app-button--danger"
        >
          Excluir conta permanentemente
        </button>
      </div>
    </div>
  );
}
