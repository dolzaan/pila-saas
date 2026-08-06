import { describe, expect, it } from "vitest";
import {
  buildUnlinkedGreetingReply,
  buildUnlinkedWhatsappReply,
  buildWhatsappLinkHelpReply,
  canUnlinkedWhatsappMessageReachBot,
  isPersonalFinancialWhatsappIntent,
  isWhatsappAccountAccessQuestion,
  isWhatsappGreeting,
  isWhatsappLinkHelpIntent,
  isWhatsappRegistrationIntent,
  shouldBlockUnlinkedWhatsappAiResult,
  shouldCheckWhatsappAccountAccess,
} from "@/lib/whatsapp-access-gate";

describe("WhatsApp account access gate", () => {
  it("blocks financial writes from an unlinked number", () => {
    expect(isPersonalFinancialWhatsappIntent("gastei 20 reais no mercado")).toBe(true);
    expect(isPersonalFinancialWhatsappIntent("recebi 3 mil de salário")).toBe(true);
    expect(isPersonalFinancialWhatsappIntent("anota uma compra de 80 no cartão")).toBe(true);
  });

  it("blocks personal reports, reminders and card queries", () => {
    expect(isPersonalFinancialWhatsappIntent("quanto está minha fatura?")).toBe(true);
    expect(isPersonalFinancialWhatsappIntent("me lembra de pagar o aluguel amanhã")).toBe(true);
    expect(isPersonalFinancialWhatsappIntent("quero um gráfico dos meus gastos")).toBe(true);
  });

  it("blocks receipt media even without a caption", () => {
    expect(isPersonalFinancialWhatsappIntent("", true)).toBe(true);
    expect(shouldCheckWhatsappAccountAccess("", true)).toBe(true);
  });

  it("keeps account creation separate from personal finance", () => {
    expect(isPersonalFinancialWhatsappIntent("quero criar minha conta")).toBe(false);
    expect(isWhatsappRegistrationIntent("quero criar minha conta")).toBe(true);
    expect(canUnlinkedWhatsappMessageReachBot("quero criar minha conta")).toBe(true);
  });

  it("recognizes natural greeting variations on the first message", () => {
    for (const greeting of ["oi", "oii", "oiii!", "oie", "olá", "oláá", "e aí", "opaa"]) {
      expect(isWhatsappGreeting(greeting)).toBe(true);
      expect(canUnlinkedWhatsappMessageReachBot(greeting)).toBe(true);
      expect(shouldCheckWhatsappAccountAccess(greeting)).toBe(false);
    }
  });

  it("allows PINs, greetings and public product questions", () => {
    expect(canUnlinkedWhatsappMessageReachBot("123456")).toBe(true);
    expect(canUnlinkedWhatsappMessageReachBot("oii")).toBe(true);
    expect(canUnlinkedWhatsappMessageReachBot("como funciona o Pila?")).toBe(true);
    expect(canUnlinkedWhatsappMessageReachBot("quanto custa o plano?")).toBe(true);
  });

  it.each([
    "O que vc faz",
    "Oq vc pode fazer",
    "Quem é vc?",
    "Como você pode me ajudar?",
    "Quero saber mais sobre o Pila",
    "Não sei por onde começar",
    "Obrigado",
  ])("allows natural first-contact conversation: %s", (message) => {
    expect(canUnlinkedWhatsappMessageReachBot(message)).toBe(true);
    expect(shouldCheckWhatsappAccountAccess(message)).toBe(false);
  });

  it("allows free-form visitor conversation instead of relying on an allowlist", () => {
    for (const message of [
      "Por que isso facilitaria minha vida?",
      "Funciona para quem é autônomo?",
      "Eu nunca usei um app financeiro",
      "Pode explicar isso de outro jeito?",
    ]) {
      expect(canUnlinkedWhatsappMessageReachBot(message)).toBe(true);
      expect(shouldCheckWhatsappAccountAccess(message)).toBe(false);
    }
  });

  it("allows onboarding continuation and other visitor text without an allowlist", () => {
    expect(canUnlinkedWhatsappMessageReachBot("Paulo Cesar Dolzan")).toBe(true);
    expect(canUnlinkedWhatsappMessageReachBot(
      "Paulo Cesar Dolzan",
      { onboardingActive: true },
    )).toBe(true);
    expect(canUnlinkedWhatsappMessageReachBot(
      "paulo@example.com",
      { onboardingActive: true },
    )).toBe(true);
  });

  it("detects questions about where an operation was registered", () => {
    expect(isWhatsappAccountAccessQuestion("em qual conta vc ta registrando isso?")).toBe(true);
    expect(shouldCheckWhatsappAccountAccess("onde você registrou isso?")).toBe(true);
  });

  it("detects requests to link an existing account", () => {
    expect(isWhatsappLinkHelpIntent("já tenho uma conta, como vinculo?")).toBe(true);
    expect(isWhatsappLinkHelpIntent("quero conectar meu whatsapp")).toBe(true);
    expect(buildWhatsappLinkHelpReply()).toContain("Gerar PIN de Vínculo");
  });

  it("still blocks financial shorthand without depending on the public conversation gate", () => {
    for (const message of ["20 mercado", "mercado 20", "salário 5000"]) {
      expect(isPersonalFinancialWhatsappIntent(message)).toBe(true);
      expect(canUnlinkedWhatsappMessageReachBot(message)).toBe(false);
      expect(shouldCheckWhatsappAccountAccess(message)).toBe(true);
    }
  });

  it("blocks financial actions detected semantically in visitor mode", () => {
    expect(shouldBlockUnlinkedWhatsappAiResult({ isTransaction: true })).toBe(true);
    expect(shouldBlockUnlinkedWhatsappAiResult({ isReminder: true })).toBe(true);
    expect(shouldBlockUnlinkedWhatsappAiResult({ isReport: true })).toBe(true);
    expect(shouldBlockUnlinkedWhatsappAiResult({ isCardQuery: true })).toBe(true);
    expect(shouldBlockUnlinkedWhatsappAiResult({ needsClarification: true })).toBe(true);
    expect(shouldBlockUnlinkedWhatsappAiResult({})).toBe(false);
  });

  it("answers the first greeting with link and account creation options", () => {
    const reply = buildUnlinkedGreetingReply();
    expect(reply).toContain("Pila Bot");
    expect(reply).toContain("Gerar PIN de Vínculo");
    expect(reply).toContain("quero criar minha conta");
  });

  it("explains that nothing was recorded and offers both link paths", () => {
    const reply = buildUnlinkedWhatsappReply();
    expect(reply).toContain("Não registrei");
    expect(reply).toContain("/dashboard/whatsapp");
    expect(reply).toContain("Gerar PIN de Vínculo");
    expect(reply).toContain("quero criar minha conta");
  });
});
