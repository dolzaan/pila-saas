const configuredSupportNumber =
  process.env.NEXT_PUBLIC_PILA_SUPPORT_WHATSAPP_NUMBER?.trim();
const rawSupportNumber = configuredSupportNumber || "5547997785853";

export const PILA_SUPPORT_WHATSAPP_NUMBER = rawSupportNumber.replace(/\D/g, "");

export const PILA_SUPPORT_WHATSAPP_DISPLAY = PILA_SUPPORT_WHATSAPP_NUMBER
  ? `+${PILA_SUPPORT_WHATSAPP_NUMBER.slice(0, 2)} ${PILA_SUPPORT_WHATSAPP_NUMBER.slice(2, 4)} ${PILA_SUPPORT_WHATSAPP_NUMBER.slice(4, 9)}-${PILA_SUPPORT_WHATSAPP_NUMBER.slice(9)}`
  : "WhatsApp do suporte";

export function getPilaSupportUrl(
  message = "Olá, Paulo! Preciso de ajuda com minha conta no Pila.",
) {
  return `https://wa.me/${PILA_SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function normalizeIntentText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const HUMAN_SUPPORT_PATTERNS = [
  /\bsuporte humano\b/,
  /\batendimento humano\b/,
  /\batendente humano\b/,
  /\bfalar com (?:um |uma )?(?:humano|pessoa|atendente|suporte)\b/,
  /\bquero (?:um |uma )?(?:humano|pessoa|atendente)\b/,
  /\bpreciso de (?:um |uma )?(?:atendente|suporte humano|atendimento humano)\b/,
  /\bchamar (?:o )?(?:suporte|atendente)\b/,
  /\bcontato (?:do|de) suporte\b/,
  /\bpessoa de verdade\b/,
  /\bfalar com (?:o )?paulo\b/,
];

export function isHumanSupportRequest(text: string) {
  const normalized = normalizeIntentText(text);
  if (!normalized) return false;
  return HUMAN_SUPPORT_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function buildHumanSupportReply() {
  const supportUrl = getPilaSupportUrl(
    "Olá, Paulo! Vim pelo Pila Bot e preciso de suporte humano.",
  );

  return [
    "🤝 Claro! Para falar diretamente com o suporte humano do Pila, chame o Paulo neste WhatsApp:",
    supportUrl,
    "",
    "Conte brevemente o que aconteceu e, se possível, envie uma captura de tela. Por segurança, não envie senha, PIN, código de verificação nem dados completos do cartão.",
  ].join("\n");
}
