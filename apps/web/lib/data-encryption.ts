import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

export class DataEncryptionUnavailableError extends Error {
  constructor(message = "Chave de criptografia de dados não configurada.") {
    super(message);
    this.name = "DataEncryptionUnavailableError";
  }
}

function getEncryptionKey() {
  const configured = process.env.PILA_DATA_ENCRYPTION_KEY?.trim();
  if (!configured) throw new DataEncryptionUnavailableError();

  let key: Buffer;
  try {
    key = Buffer.from(configured, "base64");
  } catch {
    throw new DataEncryptionUnavailableError("Chave de criptografia inválida.");
  }

  if (key.length !== 32) {
    throw new DataEncryptionUnavailableError(
      "PILA_DATA_ENCRYPTION_KEY deve conter exatamente 32 bytes em base64.",
    );
  }
  return key;
}

export function encryptData(plainText: string) {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptData(payload: string) {
  const [version, encodedIv, encodedTag, encodedContent, ...rest] = payload.split(".");
  if (
    version !== VERSION
    || !encodedIv
    || !encodedTag
    || !encodedContent
    || rest.length > 0
  ) {
    throw new Error("Payload criptografado inválido.");
  }

  const key = getEncryptionKey();
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(encodedIv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encodedContent, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function isDataEncryptionConfigured() {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}
