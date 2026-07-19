"use client";

import { revokeAllSessions } from "@/app/actions/security";
import { LogOut, ShieldAlert } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";

export function SessionControls() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function handleRevoke() {
    if (
      !confirm(
        "Encerrar todas as sessões do Pila? Você precisará entrar novamente neste dispositivo.",
      )
    ) {
      return;
    }

    setError("");
    setIsPending(true);
    try {
      const result = await revokeAllSessions();
      if (result.error) {
        setError(result.error);
        return;
      }
      await signOut({ redirectTo: "/login" });
    } catch {
      setError("Não foi possível encerrar as sessões.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="section-card" aria-labelledby="session-security-title">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-red-400/10 p-2.5 text-red-300">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <h2 id="session-security-title" className="font-semibold text-gray-100">
            Sessões da conta
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Use esta opção se perdeu um aparelho ou suspeita de algum acesso.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300" role="alert">
          {error}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-white/5 bg-black/15 p-4">
        <p className="text-sm text-gray-300">Encerrar acessos em todos os dispositivos</p>
        <p className="mt-1 text-xs text-gray-600">
          Todos os tokens atuais serão invalidados em até 60 segundos.
        </p>
        <button
          type="button"
          onClick={() => void handleRevoke()}
          disabled={isPending}
          className="app-button app-button--danger mt-4"
        >
          <LogOut className="h-4 w-4" />
          {isPending ? "Encerrando..." : "Encerrar todas as sessões"}
        </button>
      </div>
    </section>
  );
}
