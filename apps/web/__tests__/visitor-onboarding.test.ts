import { describe, expect, it } from "vitest";
import {
  appendContextualVisitorCta,
  buildVisitorDiscoveryReply,
  buildVisitorProtectedActionReply,
  visitorConversationMemoryKey,
} from "@/lib/visitor-onboarding";

describe("visitor onboarding conversation", () => {
  it("welcomes a first-time visitor with practical capabilities", () => {
    const reply = buildVisitorDiscoveryReply("Oi, tudo bem?", { isFirstContact: true });

    expect(reply).toContain("seu assistente financeiro");
    expect(reply).toContain("áudio");
    expect(reply).toContain("foto do comprovante");
    expect(reply).toContain("relatórios com gráficos");
    expect(reply).toContain("7 dias");
    expect(reply?.match(/\?/g)).toHaveLength(1);
  });

  it("does not repeat the full welcome for a returning greeting", () => {
    expect(buildVisitorDiscoveryReply("Oi", { isFirstContact: false })).toBeNull();
  });

  it.each([
    "O que você consegue fazer?",
    "O que vc faz?",
    "Oq vc pode fazer?",
    "Quem é você?",
    "Como o Pila funciona?",
    "Quero saber mais sobre o Pila",
    "Quais são as funcionalidades?",
  ])("explains capabilities naturally for: %s", (message) => {
    const reply = buildVisitorDiscoveryReply(message, { isFirstContact: false });

    expect(reply).toContain("sem você precisar abrir uma planilha ou decorar comandos");
    expect(reply).toContain("texto, áudio, foto ou PDF");
    expect(reply).toContain("orçamentos, metas e recorrências");
    expect(reply).toContain("quero criar minha conta");
    expect(reply).toContain("7 dias grátis");
    expect(reply?.match(/\?/g)).toHaveLength(1);
  });

  it("lets specific questions continue to the AI", () => {
    expect(buildVisitorDiscoveryReply("Quanto custa o plano?", { isFirstContact: true })).toBeNull();
  });

  it("adds a CTA that follows the visitor's interest", () => {
    const reply = appendContextualVisitorCta(
      "Os relatórios podem comparar períodos e separar gastos por categoria.",
      "E como funcionam os relatórios?",
    );

    expect(reply).toContain("esse tipo de relatório");
    expect(reply).toContain("quero criar minha conta");
    expect(reply).toContain("/register");
  });

  it("does not force a CTA when the message has no conversion context", () => {
    expect(appendContextualVisitorCta("Por nada!", "Obrigado"))
      .toBe("Por nada!");
  });

  it("does not duplicate a CTA already present in the reply", () => {
    const reply = "Responda “quero criar minha conta” para começar.";
    expect(appendContextualVisitorCta(reply, "Quero ver relatórios"))
      .toBe(reply);
  });

  it("previews a transaction without claiming it was saved", () => {
    const reply = buildVisitorProtectedActionReply({
      isTransaction: true,
      amount: 50,
      kind: "EXPENSE",
      description: "Mercado",
    });

    expect(reply).toContain("um gasto de R$ 50,00 em Mercado");
    expect(reply).toContain("não salvei nem consultei nada");
    expect(reply).toContain("PIN de 6 dígitos");
    expect(reply).toContain("7 dias grátis");
  });

  it("uses an isolated visitor memory namespace", () => {
    expect(visitorConversationMemoryKey("5547999999999"))
      .toBe("visitor:whatsapp:5547999999999");
  });
});
