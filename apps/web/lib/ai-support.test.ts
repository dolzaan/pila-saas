import { describe, expect, it } from "vitest";
import { parseFinancialMessage } from "./ai";

describe("human support escalation in AI parser", () => {
  it("encaminha para suporte antes de chamar o Gemini", async () => {
    const result = await parseFinancialMessage("quero falar com atendimento humano");

    expect(result.isTransaction).toBe(false);
    expect(result.replyMessage).toContain("wa.me/5547997785853");
    expect(result.replyMessage).toContain("não envie senha");
  });
});
