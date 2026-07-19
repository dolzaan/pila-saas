"use client";

import { Link2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";

export function GoogleConnectButton() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function handleConnect() {
    setError("");
    setIsPending(true);
    try {
      await signIn("google", { redirectTo: "/dashboard/security" });
    } catch {
      setError("Não foi possível iniciar a conexão com o Google.");
      setIsPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void handleConnect()}
        disabled={isPending}
        className="app-button app-button--secondary app-button--compact"
      >
        <Link2 className="h-4 w-4" />
        {isPending ? "Conectando..." : "Conectar Google"}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
