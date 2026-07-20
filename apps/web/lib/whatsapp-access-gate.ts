import { PILA_APP_URL, PILA_REGISTER_URL } from "@/lib/pila-knowledge";

const PERSONAL_FINANCIAL_ACTIONS = [
  /\b(gastei|gastamos|comprei|compramos|paguei|pagamos|recebi|recebemos|ganhei|ganhamos)\b/i,
  /\b(anota|anote|anotar|registra|registre|registrar|lança|lance|lançar|adiciona|adicione|adicionar)\b/i,
  /\b(me lembra|me lembre|lembre[- ]?me|cria um lembrete|agende|agenda)\b/i,
  /\b(minha fatura|meu limite|limite dispon[ií]vel|meu saldo|meu extrato)\b/i,
  /\b(meus gastos|minhas despesas|minhas receitas|quanto eu gastei|quanto gastei|quanto recebi)\b/i,
  /\b(gr[aá]fico (?:dos|de) meus|relat[oó]rio (?:dos|de) meus|resumo (?:dos|de) meus)\b/i,
  /\b(parcelad[oa] em \d+|\d+\s*x\b)/i,
];

const ACCOUNT_ACCESS_QUESTIONS = [
  /\bem qual conta\b/i,
  /\bqual conta (?:voc[eê] )?(?:est[aá] )?(?:usando|registrando)\b/i,
  /\bonde (?:voc[eê] )?(?:registrou|est[aá] registrando)\b/i,
  /\bisso foi registrado\b/i,
  /\b(?:est[aá]|foi) registrando (?:isso|onde)\b/i,
];

const REGISTRATION_INTENTS = [
  /\bquero (?:criar|fazer|abrir) (?:(?:uma|minha) )?conta\b/i,
  /\bcriar (?:(?:uma|minha) )?conta\b/i,
  /\bcomeçar (?:meu )?cadastro\b/i,
  /\bquero me cadastrar\b/i,
  /\bquero testar (?:o )?pila\b/i,
];

const LINK_HELP_INTENTS = [
  /\bj[aá] tenho (?:uma )?conta\b/i,
  /\bcomo (?:eu )?(?:vinculo|vincular|conecto|conectar)\b/i,
  /\bquero (?:vincular|conectar|associar)\b/i,
  /\bvincular (?:meu )?(?:n[uú]mero|whatsapp)\b/i,
  /\bgerar (?:um )?(?:pin|c[oó]digo) de v[ií]nculo\b/i,
];

const PUBLIC_PRODUCT_INTENTS = [
  /\bcomo funciona (?:o )?pila\b/i,
  /\bo que [ée] (?:o )?pila\b/i,
  /\bpre[cç]o|valor do plano|quanto custa|plano pro\b/i,
  /\bteste gr[aá]tis|7 dias gr[aá]tis\b/i,
  /\bassinatura|cancelar assinatura\b/i,
  /\bsite|link oficial|p[aá]gina de cadastro\b/i,
  /\bprivacidade|seguran[cç]a dos dados|lgpd\b/i,
  /\brecursos do pila|o que o pila faz\b/i,
  /\bpreciso instalar|tem aplicativo|tem app\b/i,
];

const GREETINGS = /^(oi|ol[aá]|opa|e a[ií]|bom dia|boa tarde|boa noite|ajuda|menu)[!,.?\s]*$/i;

export function isPersonalFinancialWhatsappIntent(text: string, hasMedia = false) {
  if (hasMedia) return true;
  const normalizedText = text.trim();
  if (!normalizedText) return false;
  return PERSONAL_FINANCIAL_ACTIONS.some((pattern) => pattern.test(normalizedText));
}

export function isWhatsappAccountAccessQuestion(text: string) {
  const normalizedText = text.trim();
  if (!normalizedText) return false;
  return ACCOUNT_ACCESS_QUESTIONS.some((pattern) => pattern.test(normalizedText));
}

export function isWhatsappRegistrationIntent(text: string) {
  const normalizedText = text.trim();
  if (!normalizedText) return false;
  return REGISTRATION_INTENTS.some((pattern) => pattern.test(normalizedText));
}

export function isWhatsappLinkHelpIntent(text: string) {
  const normalizedText = text.trim();
  if (!normalizedText) return false;
  return LINK_HELP_INTENTS.some((pattern) => pattern.test(normalizedText));
}

export function isWhatsappPublicProductIntent(text: string) {
  const normalizedText = text.trim();
  if (!normalizedText) return false;
  return PUBLIC_PRODUCT_INTENTS.some((pattern) => pattern.test(normalizedText));
}

export function canUnlinkedWhatsappMessageReachBot(
  text: string,
  options: { onboardingActive?: boolean } = {},
) {
  const normalizedText = text.trim();

  if (options.onboardingActive) return true;
  if (/^\d{6}$/.test(normalizedText)) return true;
  if (GREETINGS.test(normalizedText)) return true;
  if (isWhatsappRegistrationIntent(normalizedText)) return true;
  if (isWhatsappPublicProductIntent(normalizedText)) return true;

  return false;
}

export function shouldCheckWhatsappAccountAccess(text: string, hasMedia = false) {
  return hasMedia
    || isPersonalFinancialWhatsappIntent(text)
    || isWhatsappAccountAccessQuestion(text)
    || isWhatsappLinkHelpIntent(text)
    || !canUnlinkedWhatsappMessageReachBot(text);
}

export function buildUnlinkedWhatsappReply() {
  return [
    "🔒 Não registrei essa movimentação.",
    "",
    "Este número ainda não está vinculado a uma conta do Pila. Por segurança, nenhuma transação, lembrete, relatório ou consulta financeira pessoal é processada antes do vínculo.",
    "",
    "Se você já tem uma conta:",
    `1. Entre em ${PILA_APP_URL}/dashboard/whatsapp`,
    "2. Clique em “Gerar PIN de Vínculo”",
    "3. Envie aqui o código de 6 dígitos.",
    "",
    "Se ainda não tem uma conta, responda “quero criar minha conta” e eu começo o cadastro por aqui, ou acesse:",
    PILA_REGISTER_URL,
  ].join("\n");
}

export function buildWhatsappLinkHelpReply() {
  return [
    "🔗 Vamos vincular este número à sua conta do Pila:",
    "",
    `1. Entre em ${PILA_APP_URL}/dashboard/whatsapp`,
    "2. Clique em “Gerar PIN de Vínculo”",
    "3. Volte aqui e envie somente o código de 6 dígitos.",
    "",
    "Depois da confirmação, este número poderá registrar movimentações e consultar seus dados financeiros.",
    "",
    `Ainda não tem conta? Crie em ${PILA_REGISTER_URL} ou responda “quero criar minha conta”.`,
  ].join("\n");
}

export function buildWhatsappAccessCheckFailureReply() {
  return "⚠️ Não consegui confirmar agora se este número está vinculado. Por segurança, não registrei nada. Tente novamente em alguns instantes.";
}
