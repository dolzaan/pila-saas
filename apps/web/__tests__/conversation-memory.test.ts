import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decryptConversationMemory,
  encryptConversationMemory,
  formatConversationMemory,
  getConversationMemory,
  rememberConversationExchange,
  type ConversationExchange,
} from "@/lib/conversation-memory";

const secret = "uma-chave-de-teste-com-tamanho-suficiente";
const exchanges: ConversationExchange[] = [
  {
    user: "Quanto está a fatura do Nubank?",
    assistant: "A fatura atual do Nubank está em R$ 320,00.",
    createdAt: "2026-08-03T12:00:00.000Z",
  },
];

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("conversation memory", () => {
  it("encrypts the stored context and decrypts it with the same secret", () => {
    const encrypted = encryptConversationMemory(exchanges, secret);

    expect(encrypted).not.toContain("Nubank");
    expect(decryptConversationMemory(encrypted, secret)).toEqual(exchanges);
  });

  it("rejects encrypted memory when the secret does not match", () => {
    const encrypted = encryptConversationMemory(exchanges, secret);

    expect(() => decryptConversationMemory(encrypted, "outra-chave"))
      .toThrow();
  });

  it("formats recent exchanges as context for the model", () => {
    expect(formatConversationMemory(exchanges)).toContain(
      "Usuário: Quanto está a fatura do Nubank?\nPila: A fatura atual",
    );
    expect(formatConversationMemory([])).toBe(
      "Nenhuma conversa recente disponível.",
    );
  });

  it("degrades to an empty history when Redis is unavailable", async () => {
    vi.stubEnv("AUTH_SECRET", secret);
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.com");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(getConversationMemory("user-1")).resolves.toEqual([]);
  });

  it("redacts sensitive data, keeps six exchanges and applies a six-hour TTL", async () => {
    vi.stubEnv("AUTH_SECRET", secret);
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.com");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ result: "OK" }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const previous = Array.from({ length: 6 }, (_, index) => ({
      user: `pergunta ${index}`,
      assistant: `resposta ${index}`,
      createdAt: `2026-08-03T0${index}:00:00.000Z`,
    }));
    await expect(rememberConversationExchange(
      "user-1",
      previous,
      "meu email é paulo@example.com",
      "Entendi, Paulo.",
    )).resolves.toBe(true);

    const [, init] = fetchMock.mock.calls[0];
    const commands = JSON.parse(String(init.body));
    expect(commands[0][4]).toBe(String(6 * 60 * 60 * 1_000));

    const stored = decryptConversationMemory(commands[0][2], secret);
    expect(stored).toHaveLength(6);
    expect(stored.at(-1)?.user).toBe("meu email é [EMAIL_REMOVIDO]");
    expect(stored[0].user).toBe("pergunta 1");
  });
});
