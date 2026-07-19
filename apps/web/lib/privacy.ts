const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const CPF_PATTERN = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const CNPJ_PATTERN = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;
const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const PHONE_PATTERN = /(?<!\d)(?:\+?55[\s.-]?)?(?:\(?\d{2}\)?[\s.-]?)9?\d{4}[\s.-]?\d{4}(?!\d)/g;
const PAYMENT_CARD_CANDIDATE_PATTERN = /(?<!\d)(?:\d[ -]?){13,19}(?!\d)/g;

const DEFAULT_RAW_MESSAGE_RETENTION_DAYS = 60;
const MIN_RAW_MESSAGE_RETENTION_DAYS = 30;
const MAX_RAW_MESSAGE_RETENTION_DAYS = 90;

function passesLuhn(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

export function redactSensitiveData(value: string) {
  return value
    .replace(EMAIL_PATTERN, "[EMAIL_REMOVIDO]")
    .replace(CNPJ_PATTERN, "[CNPJ_REMOVIDO]")
    .replace(CPF_PATTERN, "[CPF_REMOVIDO]")
    .replace(UUID_PATTERN, "[CHAVE_REMOVIDA]")
    .replace(PAYMENT_CARD_CANDIDATE_PATTERN, (candidate) =>
      passesLuhn(candidate) ? "[CARTAO_REMOVIDO]" : candidate,
    )
    .replace(PHONE_PATTERN, "[TELEFONE_REMOVIDO]");
}

export function sanitizeTextForAi(value: string, maxLength = 4_000) {
  return redactSensitiveData(value)
    .replace(/\0/g, "")
    .trim()
    .slice(0, maxLength);
}

export function rawMessageForStorage(value: string) {
  if (process.env.STORE_RAW_MESSAGES !== "true") return null;
  return sanitizeTextForAi(value, 4_000) || null;
}

export function getRawMessageRetentionDays() {
  const configured = Number(process.env.RAW_MESSAGE_RETENTION_DAYS);
  if (!Number.isSafeInteger(configured)) {
    return DEFAULT_RAW_MESSAGE_RETENTION_DAYS;
  }

  return Math.min(
    MAX_RAW_MESSAGE_RETENTION_DAYS,
    Math.max(MIN_RAW_MESSAGE_RETENTION_DAYS, configured),
  );
}
