import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de Uso | Pila",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-300 py-16 px-6 sm:px-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link href="/" className="text-emerald-500 hover:text-emerald-400 font-medium inline-flex items-center gap-2">
          ← Voltar para a página inicial
        </Link>
        
        <h1 className="text-4xl font-bold text-white mb-6">Termos de Uso</h1>
        <p className="text-sm text-gray-500">Última atualização: 15 de Julho de 2026</p>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white mt-8">1. Aceitação dos Termos</h2>
          <p>
            Ao acessar e usar o aplicativo Pila, você concorda em cumprir com estes Termos de Uso e com a nossa Política de Privacidade. Se você não concorda com qualquer parte destes termos, você não deve usar o serviço.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white mt-8">2. Descrição do Serviço</h2>
          <p>
            O Pila é uma plataforma de gestão financeira pessoal que permite aos usuários registrar transações e acompanhar seus orçamentos através de um painel web e por meio de interações via WhatsApp utilizando Inteligência Artificial.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white mt-8">3. Uso Aceitável</h2>
          <p>
            Você concorda em usar o Pila apenas para fins lícitos de gestão financeira pessoal ou empresarial. É expressamente proibido:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Tentar violar a segurança da plataforma ou da rede.</li>
            <li>Usar o serviço para cometer fraudes ou atividades ilegais.</li>
            <li>Compartilhar sua conta ou credenciais com terceiros.</li>
            <li>Sobrecarregar os servidores do WhatsApp associados ao bot com milhares de mensagens automatizadas.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white mt-8">4. Assinaturas e Pagamentos</h2>
          <p>
            O acesso a funcionalidades premium (como a integração com IA via WhatsApp) requer uma assinatura do plano &quot;Pro&quot;. Os pagamentos são processados de forma segura via Stripe. Você pode cancelar a sua assinatura a qualquer momento através do seu painel de configurações. O cancelamento interromperá cobranças futuras, mas não haverá reembolso proporcional de pagamentos já efetuados.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white mt-8">5. Limitação de Responsabilidade</h2>
          <p>
            O Pila é fornecido &quot;como está&quot;. Não garantimos que a plataforma estará livre de erros ou que a inteligência artificial interpretará todas as mensagens do WhatsApp com 100% de exatidão. O usuário é responsável por conferir o painel web para garantir a precisão dos seus registros financeiros.
          </p>
        </section>
      </div>
    </div>
  );
}
