"use client";

import { useTransition } from "react";
import { createPortalSession } from "@/app/actions/stripe";

export function SubscriptionManager() {
  const [isPending, startTransition] = useTransition();

  function handleManage() {
    startTransition(async () => {
      await createPortalSession();
    });
  }

  return (
    <button
      onClick={handleManage}
      disabled={isPending}
      className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50"
    >
      {isPending ? "Carregando portal..." : "Gerenciar Assinatura"}
    </button>
  );
}
