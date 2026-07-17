import { createHash, randomBytes } from "node:crypto";

export const ACTIVATION_TOKEN_TTL_MS = 30 * 60 * 1000;

export function createActivationToken() {
  const token = randomBytes(32).toString("hex");

  return {
    token,
    tokenHash: hashActivationToken(token),
    expiresAt: new Date(Date.now() + ACTIVATION_TOKEN_TTL_MS),
  };
}

export function hashActivationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
