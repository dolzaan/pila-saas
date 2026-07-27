"use client";

import { useEffect, useState, useTransition } from "react";

type SubscriptionData = {
  billingType: string;
  status: string;
  nextDueDate: string | null;
  paymentUrl: string | null;
  paymentStatus: string | null;
};

export function SubscriptionManager({ provider }: { provider: "ASAAS" | "STRIPE" }) {
  const [isPending, startTransition] = useTransition();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (provider !== "ASAAS") return;
    void fetch("/api/billing/asaas/manage", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Falha ao carregar assinatura");
        setSubscription(payload.subscription ?? null);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Falha ao carregar assinatura"));
  }, [provider]);

  function handleCancel() {
    if (!window.confirm("Deseja cancelar a assinatura? Novas cobranças deixarão de ser geradas.")) return;
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/billing/asaas/manage", { method: "DELETE" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Falha ao cancelar assinatura");
        window.location.reload();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Falha ao cancelar assinatura");
      }
    });
  }

  if (provider === "STRIPE") {
    return <p className="text-sm text-gray-400">Assinatura legada da Stripe.</p>;
  }

  return (
    <div className="space-y-3">
      {subscription ? (
        <div className="rounded-xl border border-white/10 bg-black/10 p-4 text-sm text-gray-300">
          <p><strong>Forma de pagamento:</strong> {subscription.billingType}</p>
          <p><strong>Status:</strong> {subscription.status}</p>
          {subscription.nextDueDate ? (
            <p><strong>Próximo vencimento:</strong> {new Date(subscription.nextDueDate).toLocaleDateString("pt-BR")}</p>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3">
        {subscription?.paymentUrl ? (
          <a href={subscription.paymentUrl} target="_blank" rel="noreferrer" className="app-button app-button--secondary">
            Abrir cobrança
          </a>
        ) : null}
        <button type="button" onClick={handleCancel} disabled={isPending} className="app-button app-button--secondary">
          {isPending ? "Cancelando..." : "Cancelar assinatura"}
        </button>
      </div>
      {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
