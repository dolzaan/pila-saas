import { afterEach, describe, expect, it } from "vitest";
import {
  DataEncryptionUnavailableError,
  decryptData,
  encryptData,
  isDataEncryptionConfigured,
} from "@/lib/data-encryption";

const originalKey = process.env.PILA_DATA_ENCRYPTION_KEY;
const key = Buffer.alloc(32, 7).toString("base64");

afterEach(() => {
  if (originalKey === undefined) {
    delete process.env.PILA_DATA_ENCRYPTION_KEY;
  } else {
    process.env.PILA_DATA_ENCRYPTION_KEY = originalKey;
  }
});

describe("data encryption", () => {
  it("criptografa e recupera o texto original", () => {
    process.env.PILA_DATA_ENCRYPTION_KEY = key;
    const encrypted = encryptData("mensagem financeira privada");

    expect(encrypted).not.toContain("mensagem financeira privada");
    expect(decryptData(encrypted)).toBe("mensagem financeira privada");
  });

  it("gera payloads diferentes para o mesmo texto", () => {
    process.env.PILA_DATA_ENCRYPTION_KEY = key;

    expect(encryptData("teste")).not.toBe(encryptData("teste"));
  });

  it("falha quando a chave não está configurada", () => {
    delete process.env.PILA_DATA_ENCRYPTION_KEY;

    expect(isDataEncryptionConfigured()).toBe(false);
    expect(() => encryptData("teste")).toThrow(DataEncryptionUnavailableError);
  });

  it("falha ao tentar abrir com outra chave", () => {
    process.env.PILA_DATA_ENCRYPTION_KEY = key;
    const encrypted = encryptData("teste");
    process.env.PILA_DATA_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");

    expect(() => decryptData(encrypted)).toThrow();
  });
});
