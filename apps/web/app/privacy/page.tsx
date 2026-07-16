import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade | Pila",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-300 py-16 px-6 sm:px-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link href="/" className="text-emerald-500 hover:text-emerald-400 font-medium inline-flex items-center gap-2">
          ← Voltar para a página inicial
        </Link>
        
        <h1 className="text-4xl font-bold text-white mb-6">Política de Privacidade</h1>
        <p className="text-sm text-gray-500">Última atualização: 15 de Julho de 2026</p>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white mt-8">1. Coleta de Dados</h2>
          <p>
            O Pila coleta informações essenciais para o funcionamento do serviço de gestão financeira, incluindo seu nome, e-mail, número de WhatsApp e histórico de transações financeiras enviadas por você.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white mt-8">2. Uso das Informações</h2>
          <p>
            Seus dados são utilizados exclusivamente para:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Fornecer a funcionalidade de anotação de gastos via WhatsApp.</li>
            <li>Gerar relatórios e gráficos no seu painel web.</li>
            <li>Autenticação e segurança da sua conta.</li>
            <li>Processamento de Inteligência Artificial para categorizar seus gastos.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white mt-8">3. Inteligência Artificial e Privacidade</h2>
          <p>
            O Pila utiliza a API do Google Gemini para interpretar suas mensagens do WhatsApp. Os textos financeiros que você nos envia são repassados ao Google de forma temporária e anônima (sem associar seu nome real), exclusivamente para extrair os valores e categorias. <strong>Suas mensagens não são usadas para treinar modelos públicos de inteligência artificial.</strong>
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white mt-8">4. Seus Direitos (LGPD)</h2>
          <p>
            Em conformidade com a Lei Geral de Proteção de Dados (LGPD), você tem o direito de, a qualquer momento, através da aba de Configurações no seu painel:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Solicitar a exportação de todos os seus dados em formato legível por máquina (JSON).</li>
            <li>Solicitar a exclusão permanente e irreversível da sua conta e de todos os registros associados.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white mt-8">5. Contato</h2>
          <p>
            Em caso de dúvidas sobre nossa política de privacidade, entre em contato através do e-mail: <strong>privacidade@pila.com.br</strong>
          </p>
        </section>
      </div>
    </div>
  );
}
