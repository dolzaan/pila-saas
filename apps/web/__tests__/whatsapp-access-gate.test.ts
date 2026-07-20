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
      expect(shouldCheckWhatsappAccountAccess(greeting)).toBe(true);
    }
  });

  it("allows PINs, greetings and public product questions", () => {
    expect(canUnlinkedWhatsappMessageReachBot("123456")).toBe(true);
    expect(canUnlinkedWhatsappMessageReachBot("oii")).toBe(true);
    expect(canUnlinkedWhatsappMessageReachBot("como funciona o Pila?")).toBe(true);
    expect(canUnlinkedWhatsappMessageReachBot("quanto custa o plano?")).toBe(true);
  });

  it("allows onboarding continuation only when a session is active", () => {
    expect(canUnlinkedWhatsappMessageReachBot("Paulo Cesar Dolzan")).toBe(false);
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

  it("blocks shorthand that is not on the public allowlist", () => {
    expect(shouldCheckWhatsappAccountAccess("20 mercado")).toBe(true);
    expect(shouldCheckWhatsappAccountAccess("mercado 20")).toBe(true);
    expect(shouldCheckWhatsappAccountAccess("salário 5000")).toBe(true);
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
