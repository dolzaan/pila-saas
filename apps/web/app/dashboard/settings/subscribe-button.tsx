"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type BillingType = "PIX" | "BOLETO" | "CREDIT_CARD";

function onlyDigits(value: string, max = 14): string {
  return value.replace(/\D/g, "").slice(0, max);
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

function formatPhone(value: string): string {
  return onlyDigits(value, 11)
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function formatPostalCode(value: string): string {
  return onlyDigits(value, 8).replace(/^(\d{5})(\d)/, "$1-$2");
}

export function SubscribeButton({ label = "Assinar Plano Pro" }: { label?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showOptions, setShowOptions] = useState(false);
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [province, setProvince] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleReconcile() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/billing/asaas/reconcile", {
          method: "POST",
        });
        const payload = (await response.json()) as { error?: string; reconciled?: boolean };
        if (!response.ok || !payload.reconciled) {
          throw new Error(payload.error || "Pagamento ainda não encontrado");
        }
        setSuccess("Pagamento encontrado. Seu plano Pro foi ativado.");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Não foi possível sincronizar o pagamento");
      }
    });
  }

  function handleSubscribe(billingType: BillingType) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const isCard = billingType === "CREDIT_CARD";
        const response = await fetch(
          isCard ? "/api/billing/asaas/checkout" : "/api/billing/asaas/subscription",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              ...(isCard
                ? {
                    phoneNumber: onlyDigits(phoneNumber, 11),
                    address: address.trim(),
                    addressNumber: addressNumber.trim(),
                    complement: complement.trim() || undefined,
                    postalCode: onlyDigits(postalCode, 8),
                    province: province.trim(),
                  }
                : { billingType }),
              cpfCnpj: onlyDigits(cpfCnpj),
            }),
          },
        );
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
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setShowOptions(true)} className="app-button app-button--primary">
            {label}
          </button>
          <button type="button" onClick={handleReconcile} disabled={isPending} className="app-button app-button--secondary">
            {isPending ? "Sincronizando..." : "Já paguei — sincronizar"}
          </button>
        </div>
        {success ? <p role="status" className="text-sm text-emerald-300">{success}</p> : null}
        {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
      </div>
    );
  }

  const documentDigits = onlyDigits(cpfCnpj);
  const documentValid = documentDigits.length === 11 || documentDigits.length === 14;
  const cardDetailsValid =
    onlyDigits(phoneNumber, 11).length >= 10 &&
    address.trim().length >= 2 &&
    addressNumber.trim().length >= 1 &&
    onlyDigits(postalCode, 8).length === 8 &&
    province.trim().length >= 2;

  const inputClass =
    "rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20";

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="subscription-document" className="mb-1 block text-sm font-medium text-gray-200">
          CPF ou CNPJ do pagador
        </label>
        <input id="subscription-document" value={cpfCnpj} onChange={(event) => setCpfCnpj(formatDocument(event.target.value))} placeholder="000.000.000-00" inputMode="numeric" disabled={isPending} className={`w-full ${inputClass}`} />
      </div>

      <details className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <summary className="cursor-pointer text-sm font-medium text-gray-200">
          Dados necessários para cartão recorrente
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input value={phoneNumber} onChange={(e) => setPhoneNumber(formatPhone(e.target.value))} placeholder="Telefone com DDD" inputMode="tel" className={inputClass} />
          <input value={postalCode} onChange={(e) => setPostalCode(formatPostalCode(e.target.value))} placeholder="CEP" inputMode="numeric" className={inputClass} />
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua / avenida" className={`${inputClass} sm:col-span-2`} />
          <input value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} placeholder="Número" className={inputClass} />
          <input value={province} onChange={(e) => setProvince(e.target.value)} placeholder="Bairro" className={inputClass} />
          <input value={complement} onChange={(e) => setComplement(e.target.value)} placeholder="Complemento (opcional)" className={`${inputClass} sm:col-span-2`} />
        </div>
      </details>

      <p className="text-sm text-gray-300">Escolha como deseja pagar a assinatura mensal:</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => handleSubscribe("CREDIT_CARD")} disabled={isPending || !documentValid || !cardDetailsValid} className="app-button app-button--primary">
          {isPending ? "Abrindo pagamento..." : "Cartão recorrente"}
        </button>
        <button type="button" onClick={() => handleSubscribe("PIX")} disabled={isPending || !documentValid} className="app-button">Pagar com Pix</button>
        <button type="button" onClick={() => handleSubscribe("BOLETO")} disabled={isPending || !documentValid} className="app-button">Pagar com boleto</button>
        <button type="button" onClick={() => setShowOptions(false)} disabled={isPending} className="text-sm text-gray-400 underline-offset-4 hover:underline">Voltar</button>
      </div>
      <button type="button" onClick={handleReconcile} disabled={isPending} className="text-sm font-medium text-emerald-300 underline-offset-4 hover:underline">
        Já concluí o pagamento — sincronizar agora
      </button>
      <p className="text-xs text-gray-500">Telefone e endereço são exigidos apenas pelo checkout de cartão do Asaas.</p>
      {success ? <p role="status" className="text-sm text-emerald-300">{success}</p> : null}
      {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
