import { z } from "zod";

export const ONBOARDING_TTL_MS = 24 * 60 * 60 * 1000;

const NameSchema = z
  .string()
  .trim()
  .min(2)
  .max(100)
  .regex(/^[\p{L}][\p{L}\p{M}' -]*$/u);

const EmailSchema = z.string().trim().toLowerCase().email().max(254);

export function parseOnboardingName(text: string) {
  const cleaned = text
    .replace(/^(?:meu nome (?:é|e)|sou|pode me chamar de)\s+/i, "")
    .trim();
  return NameSchema.safeParse(cleaned);
}

export function parseOnboardingEmail(text: string) {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return EmailSchema.safeParse(match?.[0] || text.trim());
}

export function isConfirmation(text: string) {
  return /^(?:sim|confirmo|confirmar|pode criar|aceito|correto|certo|ok|prosseguir)[!.\s]*$/i.test(text.trim());
}

export function isCancellation(text: string) {
  return /^(?:não|nao|cancelar|cancela|desistir|parar|sair)[!.\s]*$/i.test(text.trim());
}
