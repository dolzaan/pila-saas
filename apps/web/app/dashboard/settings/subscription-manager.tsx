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
      className="app-button app-button--secondary"
    >
      {isPending ? "Carregando portal..." : "Gerenciar Assinatura"}
    </button>
  );
}
