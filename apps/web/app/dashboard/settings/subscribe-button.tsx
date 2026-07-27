"use client";

import { useState, useTransition } from "react";

type BillingType = "PIX" | "BOLETO" | "CREDIT_CARD";

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 14);
}

function formatDocument(value: string): string {
  const digits = onlyDigits(value);

  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function SubscribeButton({ label = "Assinar Plano Pro" }: { label?: string }) {
  const [isPending, startTransition] = useTransition();
  const [showOptions, setShowOptions] = useState(false);
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubscribe(billingType: BillingType) {
    setError(null);
    startTransition(async () => {
      try {
        const endpoint =
          billingType === "CREDIT_CARD"
            ? "/api/billing/asaas/checkout"
            : "/api/billing/asaas/subscription";
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...(billingType === "CREDIT_CARD" ? {} : { billingType }),
            cpfCnpj: onlyDigits(cpfCnpj),
          }),
        });
        const payload = (await response.json()) as {
          paymentUrl?: string | null;
          checkoutUrl?: string | null;
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error || "Não foi possível iniciar o pagamento");
        const destination = payload.checkoutUrl ?? payload.paymentUrl;
        if (!destination) throw new Error("O link de pagamento ainda não está disponível");
        window.location.href = destination;
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

  const documentDigits = onlyDigits(cpfCnpj);
  const canSubmit = documentDigits.length === 11 || documentDigits.length === 14;

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="subscription-document" className="mb-1 block text-sm font-medium text-gray-200">
          CPF ou CNPJ do pagador
        </label>
        <input
          id="subscription-document"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={cpfCnpj}
          onChange={(event) => setCpfCnpj(formatDocument(event.target.value))}
          placeholder="000.000.000-00"
          disabled={isPending}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
        />
        <p className="mt-1 text-xs text-gray-500">
          O documento é enviado com segurança ao Asaas para identificar o pagador.
        </p>
      </div>

      <p className="text-sm text-gray-300">Escolha como deseja pagar a assinatura mensal:</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => handleSubscribe("CREDIT_CARD")}
          disabled={isPending || !canSubmit}
          className="app-button app-button--primary"
        >
          {isPending ? "Abrindo pagamento..." : "Cartão recorrente"}
        </button>
        <button
          type="button"
          onClick={() => handleSubscribe("PIX")}
          disabled={isPending || !canSubmit}
          className="app-button"
        >
          Pagar com Pix
        </button>
        <button
          type="button"
          onClick={() => handleSubscribe("BOLETO")}
          disabled={isPending || !canSubmit}
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
      <p className="text-xs text-gray-500">
        No cartão, os dados são preenchidos diretamente no checkout hospedado pelo Asaas.
      </p>
      {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
