import { PILA_REGISTER_URL } from "@/lib/pila-knowledge";

function normalizeMessage(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\boq\b/g, "o que")
    .trim();
}

const GREETING_ONLY = /^(?:oi+|ola|opa|e ai|bom dia|boa tarde|boa noite)(?: pila)?(?: tudo bem| tudo bom| tudo certo| como vai| beleza)?$/;
const CAPABILITY_DISCOVERY = /\b(?:quem (?:e|eh) (?:voce|vc|ce|o pila)|o que (?:voce|vc|ce|o pila) (?:faz|pode fazer|consegue fazer)|como (?:voce|vc|ce|o pila) funciona|como (?:voce|vc|ce|o pila) pode me ajudar|quais (?:sao )?(?:as )?(?:funcoes|funcionalidades|recursos)|me (?:explica|explique|fala|fale|conte) (?:mais )?(?:sobre )?(?:voce|vc|o pila)|quero (?:conhecer|entender|saber) (?:mais )?(?:sobre )?(?:voce|vc|o pila)|o que da para fazer)\b/;

function welcomeReply(message: string) {
  const opening = message.startsWith("bom dia")
    ? "Bom dia!"
    : message.startsWith("boa tarde")
      ? "Boa tarde!"
      : message.startsWith("boa noite")
        ? "Boa noite!"
        : "Oi!";

  return [
    `${opening} Eu sou o Pila, seu assistente financeiro aqui no WhatsApp.`,
    "A ideia é tirar da sua cabeça o trabalho de anotar e organizar o dinheiro. Você pode me contar algo simples como “gastei R$ 42 no mercado”, mandar um áudio ou até uma foto do comprovante, e eu organizo isso na sua conta.",
    "Também consigo criar lembretes de contas, acompanhar cartões e orçamentos e montar relatórios com gráficos — por exemplo, “mostre onde gastei mais este mês” ou “compare meus gastos com o mês passado”.",
    "Quer que eu te explique melhor alguma dessas partes ou prefere começar agora?",
    `Você pode responder “quero criar minha conta” e fazer tudo por aqui. O Pila Pro fica grátis por 7 dias, sem cartão. Se preferir usar o site: ${PILA_REGISTER_URL}`,
  ].join("\n\n");
}

function capabilitiesReply() {
  return [
    "Consigo cuidar de boa parte da rotina financeira sem você precisar abrir uma planilha ou decorar comandos.",
    "Você pode falar comigo do seu jeito para registrar gastos e ganhos por texto, áudio, foto ou PDF; criar lembretes de contas; consultar cartões e saldos; acompanhar orçamentos, metas e recorrências; e pedir relatórios ou comparações com gráficos.",
    "Alguns exemplos: “paguei R$ 85 de internet no Pix”, “me lembra do aluguel dia 10” ou “mostre meus gastos por categoria dos últimos três meses”. Eu entendo a intenção e organizo tudo usando os dados reais da sua conta.",
    "Qual dessas partes você gostaria de conhecer primeiro?",
    `Quando quiser testar, responda “quero criar minha conta”. São 7 dias grátis, sem cartão — ou acesse ${PILA_REGISTER_URL}`,
  ].join("\n\n");
}

export function buildVisitorDiscoveryReply(
  message: string,
  options: { isFirstContact: boolean },
) {
  const normalized = normalizeMessage(message);

  if (CAPABILITY_DISCOVERY.test(normalized)) return capabilitiesReply();
  if (options.isFirstContact && GREETING_ONLY.test(normalized)) return welcomeReply(normalized);
  return null;
}
