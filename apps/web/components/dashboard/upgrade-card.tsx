"use client";

import { Zap } from "lucide-react";
import { SubscribeButton } from "@/app/dashboard/settings/subscribe-button";

interface UpgradeCardProps {
  title?: string;
  description?: string;
  blockAccess?: boolean;
}

export function UpgradeCard({
  title = "Desbloqueie o Pila Pro",
  description = "Assine agora para liberar a integração com Inteligência Artificial via WhatsApp e controle suas finanças num piscar de olhos.",
  blockAccess = false,
}: UpgradeCardProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-emerald-900/40 to-black border border-emerald-500/30 rounded-3xl ${blockAccess ? "min-h-[400px]" : ""}`}>
      <Zap className="w-12 h-12 text-emerald-400 mb-4" />
      <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
      <p className="text-emerald-100/70 max-w-md mb-8 leading-relaxed">
        {description}
      </p>
      <SubscribeButton label="Assinar Plano Pro" />
    </div>
  );
}
