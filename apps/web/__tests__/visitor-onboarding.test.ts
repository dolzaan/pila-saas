import { describe, expect, it } from "vitest";
import { buildVisitorDiscoveryReply } from "@/lib/visitor-onboarding";

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
    "Quem é você?",
    "Como o Pila funciona?",
    "Quero saber mais sobre o Pila",
    "Quais são as funcionalidades?",
  ])("explains capabilities naturally for: %s", (message) => {
    const reply = buildVisitorDiscoveryReply(message, { isFirstContact: false });

    expect(reply).toContain("sem você precisar abrir uma planilha ou decorar comandos");
    expect(reply).toContain("texto, áudio, foto ou PDF");
    expect(reply).toContain("orçamentos, metas e recorrências");
    expect(reply?.match(/\?/g)).toHaveLength(1);
  });

  it("lets specific questions continue to the AI", () => {
    expect(buildVisitorDiscoveryReply("Quanto custa o plano?", { isFirstContact: true })).toBeNull();
  });
});
