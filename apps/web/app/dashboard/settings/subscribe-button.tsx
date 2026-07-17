"use client";

import { useTransition } from "react";
import { createCheckoutSession } from "@/app/actions/stripe";

export function SubscribeButton({ label = "Assinar Plano Pro" }: { label?: string }) {
  const [isPending, startTransition] = useTransition();

  function handleSubscribe() {
    startTransition(async () => {
      await createCheckoutSession();
    });
  }

  return (
    <button
      type="button"
      onClick={handleSubscribe}
      disabled={isPending}
      className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? "Abrindo pagamento..." : label}
    </button>
  );
}
