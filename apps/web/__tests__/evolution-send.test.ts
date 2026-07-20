import { describe, expect, it } from "vitest";
import {
  inspectEvolutionSendPayload,
  normalizeWhatsappRecipient,
} from "@/lib/evolution";

describe("Evolution outbound validation", () => {
  it("normaliza números e JIDs antes do sendText", () => {
    expect(normalizeWhatsappRecipient("5547997785853")).toBe("5547997785853");
    expect(normalizeWhatsappRecipient("5547997785853@s.whatsapp.net")).toBe("5547997785853");
    expect(normalizeWhatsappRecipient("+55 (47) 99778-5853")).toBe("5547997785853");
  });

  it("não tenta enviar diretamente para um identificador @lid", () => {
    expect(normalizeWhatsappRecipient("123456789012345@lid")).toBeNull();
  });

  it("aceita a resposta quando a Evolution confirma um ID de mensagem", () => {
    expect(inspectEvolutionSendPayload({
      key: {
        remoteJid: "5547997785853@s.whatsapp.net",
        fromMe: true,
        id: "3EB012345678",
      },
      status: "PENDING",
      message: { conversation: "Olá" },
    })).toEqual({
      accepted: true,
      messageId: "3EB012345678",
      remoteJid: "5547997785853@s.whatsapp.net",
      status: "PENDING",
    });
  });

  it("rejeita erro lógico mesmo quando o servidor responde 2xx", () => {
    expect(inspectEvolutionSendPayload({
      status: 400,
      error: "Bad Request",
      response: { message: ["The number does not exist"] },
    })).toMatchObject({
      accepted: false,
      error: "Bad Request",
      status: "400",
    });
  });

  it("rejeita resposta 2xx sem ID de mensagem para que ela vá à fila", () => {
    expect(inspectEvolutionSendPayload({
      status: "PENDING",
      message: { conversation: "Olá" },
    })).toMatchObject({
      accepted: false,
      error: "Evolution respondeu sem confirmar o ID da mensagem",
      status: "PENDING",
    });
  });

  it("aceita formatos com key dentro de data", () => {
    expect(inspectEvolutionSendPayload({
      data: {
        key: {
          id: "MESSAGE-ID",
          remoteJid: "5547997785853@s.whatsapp.net",
        },
        status: "SERVER_ACK",
      },
    })).toMatchObject({
      accepted: true,
      messageId: "MESSAGE-ID",
      status: "SERVER_ACK",
    });
  });
});
