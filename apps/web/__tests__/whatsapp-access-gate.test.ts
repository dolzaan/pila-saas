import { describe, expect, it } from "vitest";
import {
  buildUnlinkedWhatsappReply,
  isPersonalFinancialWhatsappIntent,
  isWhatsappAccountAccessQuestion,
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
  });

  it("does not block public product questions or onboarding messages", () => {
    expect(isPersonalFinancialWhatsappIntent("como funciona o Pila?")).toBe(false);
    expect(isPersonalFinancialWhatsappIntent("quero criar minha conta")).toBe(false);
    expect(isPersonalFinancialWhatsappIntent("123456")).toBe(false);
  });

  it("detects questions about where an operation was registered", () => {
    expect(isWhatsappAccountAccessQuestion("em qual conta vc ta registrando isso?")).toBe(true);
    expect(shouldCheckWhatsappAccountAccess("onde você registrou isso?")).toBe(true);
  });

  it("explains that nothing was recorded and offers both link paths", () => {
    const reply = buildUnlinkedWhatsappReply();
    expect(reply).toContain("Não registrei");
    expect(reply).toContain("/dashboard/whatsapp");
    expect(reply).toContain("Gerar PIN de Vínculo");
    expect(reply).toContain("quero criar minha conta");
  });
});
