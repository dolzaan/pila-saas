"use client";

import { useState, useTransition } from "react";

type BillingType = "PIX" | "BOLETO";

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
        const response = await fetch("/api/billing/asaas/subscription", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ billingType, cpfCnpj: onlyDigits(cpfCnpj) }),
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
          O Asaas exige o documento para gerar cobranças por Pix ou boleto.
        </p>
      </div>

      <p className="text-sm text-gray-300">Escolha como deseja pagar a assinatura mensal:</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => handleSubscribe("PIX")}
          disabled={isPending || !canSubmit}
          className="app-button app-button--primary"
        >
          {isPending ? "Criando cobrança..." : "Pagar com Pix"}
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
      <p className="text-xs text-gray-500">Cartão recorrente será habilitado após a tokenização segura no checkout.</p>
      {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
