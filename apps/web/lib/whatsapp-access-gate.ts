import { PILA_APP_URL, PILA_REGISTER_URL } from "@/lib/pila-knowledge";

const PERSONAL_FINANCIAL_ACTIONS = [
  /\b(gastei|gastamos|comprei|compramos|paguei|pagamos|recebi|recebemos|ganhei|ganhamos)\b/i,
  /\b(anota|anote|anotar|registra|registre|registrar|lança|lance|lançar|adiciona|adicione|adicionar)\b/i,
  /\b(me lembra|me lembre|lembre[- ]?me|cria um lembrete|agende|agenda)\b/i,
  /\b(minha fatura|meu limite|limite dispon[ií]vel|minha conta|meu saldo|meu extrato)\b/i,
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

export function shouldCheckWhatsappAccountAccess(text: string, hasMedia = false) {
  return isPersonalFinancialWhatsappIntent(text, hasMedia)
    || isWhatsappAccountAccessQuestion(text);
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

export function buildWhatsappAccessCheckFailureReply() {
  return "⚠️ Não consegui confirmar agora se este número está vinculado. Por segurança, não registrei nada. Tente novamente em alguns instantes.";
}
