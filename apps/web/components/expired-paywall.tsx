import { Rocket, CheckCircle2, Lock } from "lucide-react";
import { SubscribeButton } from "@/app/dashboard/settings/subscribe-button";
import type { SubStatusResult } from "@/lib/subscription";

export default function ExpiredPaywall({ status }: { status: SubStatusResult["status"] }) {
  const paymentFailed = status === "PAST_DUE";

  return (
    <div className="paywall-shell">
      <div className="paywall-card">
        
        {/* Header Section */}
        <div className="paywall-hero">
          <div className="paywall-icon">
            <Lock className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-[#04120d] mb-4 tracking-[-0.04em]">
            {paymentFailed ? "Pagamento da mensalidade pendente" : "Seu Período de Teste Acabou"}
          </h1>
          <p className="text-lg text-[#04120d]/70 max-w-lg mx-auto">
            {paymentFailed
              ? "Não conseguimos confirmar o pagamento da sua mensalidade. Regularize a cobrança para recuperar o acesso ao Pila Pro."
              : "Esperamos que você tenha aproveitado os 7 dias gratuitos do Pila! Para continuar acessando o dashboard e usar o bot do WhatsApp, assine o plano Pro."}
          </p>
        </div>

        {/* Benefits Section */}
        <div className="p-8">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">
            O que você garante com o Plano Pro:
          </h2>
          
          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            {[
              "Gestão financeira completa",
              "Bot do WhatsApp para IA",
              "Lembretes de vencimentos",
              "Análise inteligente de gastos",
              "Cadastro ilimitado de contas",
              "Suporte prioritário"
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                <span className="text-gray-300 font-medium">{benefit}</span>
              </div>
            ))}
          </div>

          <div className="text-center">
            <div className="inline-flex items-center gap-3">
              <Rocket className="w-6 h-6 text-emerald-300" />
              <SubscribeButton label={paymentFailed ? "Regularizar pagamento" : "Assinar por R$ 19,90/mês"} />
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Pagamento seguro processado via Stripe
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
