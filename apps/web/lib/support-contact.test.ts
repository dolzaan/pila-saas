import { describe, expect, it } from "vitest";
import {
  buildHumanSupportReply,
  getPilaSupportUrl,
  isHumanSupportRequest,
} from "./support-contact";

describe("isHumanSupportRequest", () => {
  it.each([
    "quero suporte humano",
    "preciso de atendimento humano",
    "posso falar com uma pessoa?",
    "quero um atendente",
    "me passa o contato do suporte",
    "quero falar com o Paulo",
    "tem uma pessoa de verdade para me ajudar?",
  ])("reconhece pedido de atendimento: %s", (message) => {
    expect(isHumanSupportRequest(message)).toBe(true);
  });

  it.each([
    "me ajude a criar um orçamento",
    "como funciona o suporte a cartões?",
    "gastei 50 no mercado",
    "quero criar minha conta",
  ])("não desvia comandos comuns: %s", (message) => {
    expect(isHumanSupportRequest(message)).toBe(false);
  });
});

describe("support contact", () => {
  it("gera URL oficial do WhatsApp", () => {
    expect(getPilaSupportUrl()).toContain("wa.me/5547997785853");
  });

  it("inclui orientação de segurança na resposta", () => {
    const reply = buildHumanSupportReply();
    expect(reply).toContain("wa.me/5547997785853");
    expect(reply).toContain("não envie senha");
  });
});
