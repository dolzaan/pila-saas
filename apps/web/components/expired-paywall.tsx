import { Rocket, CheckCircle2, Lock } from "lucide-react";

export default function ExpiredPaywall() {
  return (
    <div className="min-h-full flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
        
        {/* Header Section */}
        <div className="bg-primary/10 dark:bg-primary/5 p-8 text-center border-b border-primary/20">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Seu Período de Teste Acabou
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-lg mx-auto">
            Esperamos que você tenha aproveitado os 7 dias gratuitos do Pila! Para continuar acessando o dashboard e usar o bot do WhatsApp, assine o plano Pro.
          </p>
        </div>

        {/* Benefits Section */}
        <div className="p-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
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
                <span className="text-gray-700 dark:text-gray-300 font-medium">{benefit}</span>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button className="inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-bold text-white bg-primary rounded-xl hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 w-full sm:w-auto">
              <Rocket className="w-6 h-6" />
              Assinar Agora
            </button>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Pagamento seguro processado via Stripe
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
