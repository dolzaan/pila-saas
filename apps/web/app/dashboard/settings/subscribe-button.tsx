"use client";

import { useState, useTransition } from "react";

type BillingType = "PIX" | "BOLETO";

export function SubscribeButton({ label = "Assinar Plano Pro" }: { label?: string }) {
  const [isPending, startTransition] = useTransition();
  const [showOptions, setShowOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubscribe(billingType: BillingType) {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/billing/asaas/subscription", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ billingType }),
        });
        const payload = (await response.json()) as { paymentUrl?: string | null; error?: string };
        if (!response.ok) throw new Error(payload.error || "Não foi possível iniciar o pagamento");
        if (!payload.paymentUrl) throw new Error("A cobrança foi criada, mas o link ainda não está disponível");
        window.location.href = payload.paymentUrl;
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Não foi possível iniciar o pagamento");
      }
    });
  }

  if (!showOptions) {
    return (
      <button type="button" onClick={() => setShowOptions(true)} className="app-button app-button--primary">
        {label}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-300">Escolha como deseja pagar a assinatura mensal:</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => handleSubscribe("PIX")}
          disabled={isPending}
          className="app-button app-button--primary"
        >
          {isPending ? "Criando cobrança..." : "Pagar com Pix"}
        </button>
        <button
          type="button"
          onClick={() => handleSubscribe("BOLETO")}
          disabled={isPending}
          className="app-button"
        >
          Pagar com boleto
        </button>
        <button
          type="button"
          onClick={() => setShowOptions(false)}
          disabled={isPending}
          className="text-sm text-gray-400 underline-offset-4 hover:underline"
        >
          Voltar
        </button>
      </div>
      <p className="text-xs text-gray-500">Cartão recorrente será habilitado após a tokenização segura no checkout.</p>
      {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
