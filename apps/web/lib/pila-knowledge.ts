import {
  getPilaSupportUrl,
  PILA_SUPPORT_WHATSAPP_DISPLAY,
} from "@/lib/support-contact";

const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

export const PILA_APP_URL = (configuredAppUrl || "https://usepila.vercel.app").replace(/\/$/, "");
export const PILA_REGISTER_URL = `${PILA_APP_URL}/register`;
export const PILA_LOGIN_URL = `${PILA_APP_URL}/login`;
export const PILA_SUPPORT_URL = getPilaSupportUrl(
  "Olá, Paulo! Preciso de ajuda com minha conta no Pila.",
);

/**
 * Fonte oficial para respostas institucionais do Pila Bot.
 * Informações variáveis devem vir do banco/Stripe quando isso for implementado.
 */
export const PILA_PUBLIC_KNOWLEDGE = `
INFORMAÇÕES OFICIAIS DO PILA:
- Nome: Pila.
- Site oficial: ${PILA_APP_URL}
- Cadastro: ${PILA_REGISTER_URL}
- Login: ${PILA_LOGIN_URL}
- Suporte humano: ${PILA_SUPPORT_WHATSAPP_DISPLAY} — ${PILA_SUPPORT_URL}
- O Pila é um SaaS de organização financeira pessoal integrado ao WhatsApp.
- Pelo WhatsApp, o cliente pode registrar receitas e despesas com texto, áudio, foto ou PDF, pedir resumos, gráficos e lembretes.
- No painel web, o cliente acompanha transações, categorias, orçamentos, recorrências, relatórios e configurações.
- O plano Pila Pro custa R$ 19,90 por mês.
- Novos clientes recebem 7 dias grátis, sem precisar cadastrar cartão.
- Depois do teste, o cliente escolhe se deseja assinar o Pila Pro.
- A assinatura é processada com segurança pela Stripe e pode ser cancelada quando o cliente quiser.
- Não é necessário instalar outro aplicativo: o WhatsApp é usado para conversar com o bot e o navegador para acessar o painel.
- O cliente pode exportar seus dados ou solicitar a exclusão da conta nas configurações.

REGRAS INSTITUCIONAIS:
- Nunca invente ou altere links, preços, prazos, recursos ou políticas.
- Ao informar o site, escreva exatamente ${PILA_APP_URL}.
- Ao pedirem suporte humano, atendimento humano ou um atendente, envie exatamente ${PILA_SUPPORT_URL}.
- Oriente o usuário a nunca enviar senha, PIN, código de verificação, CVV ou dados completos do cartão ao suporte.
- Se a pergunta não puder ser respondida com estas informações, diga que não conseguiu confirmar; não improvise.
- Quando alguém demonstrar interesse em começar, explique brevemente o teste grátis e envie ${PILA_REGISTER_URL}.
`.trim();
