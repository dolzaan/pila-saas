const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 60_000;

export function getExternalTimeoutMs(environmentName: string, fallbackMs: number) {
  const configured = Number(process.env[environmentName]);
  if (!Number.isSafeInteger(configured)) return fallbackMs;

  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, configured));
}

export function externalTimeoutSignal(environmentName: string, fallbackMs: number) {
  return AbortSignal.timeout(getExternalTimeoutMs(environmentName, fallbackMs));
}

export function isTimeoutError(error: unknown) {
  return error instanceof Error
    && (error.name === "AbortError" || error.name === "TimeoutError");
}
