import { describe, expect, it } from "vitest";
import {
  PILA_APP_URL,
  PILA_LOGIN_URL,
  PILA_PUBLIC_KNOWLEDGE,
  PILA_REGISTER_URL,
} from "@/lib/pila-knowledge";

describe("Pila public knowledge", () => {
  it("uses the official production URL as the safe fallback", () => {
    expect(PILA_APP_URL).toBe("https://usepila.vercel.app");
    expect(PILA_REGISTER_URL).toBe("https://usepila.vercel.app/register");
    expect(PILA_LOGIN_URL).toBe("https://usepila.vercel.app/login");
  });

  it("includes the official URL and current plan information", () => {
    expect(PILA_PUBLIC_KNOWLEDGE).toContain(PILA_APP_URL);
    expect(PILA_PUBLIC_KNOWLEDGE).toContain("R$ 19,90");
    expect(PILA_PUBLIC_KNOWLEDGE).toContain("7 dias grátis");
  });
});
