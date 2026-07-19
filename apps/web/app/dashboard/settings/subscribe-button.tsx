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
      className="app-button app-button--primary"
    >
      {isPending ? "Abrindo pagamento..." : label}
    </button>
  );
}
