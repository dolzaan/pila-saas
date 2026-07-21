"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, ShieldCheck } from "lucide-react";

type TelegramConnectionCardProps = {
  connected: boolean;
  connectedUsername?: string | null;
};

export function TelegramConnectionCard({
  connected,
  connectedUsername,
}: TelegramConnectionCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConnect() {
    setError(null);
    const popup = window.open("about:blank", "_blank", "noopener,noreferrer");

    startTransition(async () => {
      try {
        const response = await fetch("/api/telegram/link", { method: "POST" });
        const payload = await response.json() as { telegramUrl?: string; error?: string };
        if (!response.ok || !payload.telegramUrl) {
          throw new Error(payload.error || "Não foi possível gerar o link do Telegram");
        }

        if (popup) {
          popup.location.href = payload.telegramUrl;
        } else {
          window.location.href = payload.telegramUrl;
        }
      } catch (cause) {
        popup?.close();
        setError(cause instanceof Error ? cause.message : "Não foi possível conectar o Telegram");
      }
    });
  }

  function handleDisconnect() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/telegram/link", { method: "DELETE" });
        const payload = await response.json() as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "Não foi possível desconectar o Telegram");
        }
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Não foi possível desconectar o Telegram");
      }
    });
  }

  return (
    <section id="telegram" className="section-card scroll-mt-28 md:col-span-2">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
            Canal de contingência
          </span>
          <div className="mt-2 flex items-center gap-3">
            <div className="rounded-xl border border-sky-400/20 bg-sky-400/10 p-2.5">
              <Send className="h-5 w-5 text-sky-300" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Telegram</h2>
              <p className="text-sm text-slate-400">
                Continue usando o Pila quando o WhatsApp estiver indisponível.
              </p>
            </div>
          </div>
        </div>

        {connected ? (
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              {connectedUsername ? `Conectado como ${connectedUsername}` : "Telegram conectado"}
            </div>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={isPending}
              className="app-button app-button--secondary"
            >
              {isPending ? "Desconectando..." : "Desconectar"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleConnect}
            disabled={isPending}
            className="app-button app-button--primary"
          >
            {isPending ? "Gerando link..." : "Conectar Telegram"}
          </button>
        )}
      </div>

      <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
        O vínculo é feito por um link temporário e só funciona em conversa privada com o bot.
        As mesmas regras de assinatura, segurança e idempotência do WhatsApp continuam valendo.
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
