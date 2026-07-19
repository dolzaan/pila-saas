import { afterEach, describe, expect, it, vi } from "vitest";
import { getExternalTimeoutMs, isTimeoutError } from "@/lib/external-service";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("external service timeouts", () => {
  it("uses the configured value within the safe range", () => {
    vi.stubEnv("TEST_TIMEOUT_MS", "15000");
    expect(getExternalTimeoutMs("TEST_TIMEOUT_MS", 5000)).toBe(15000);
  });

  it("clamps unsafe values", () => {
    vi.stubEnv("TEST_TIMEOUT_MS", "100");
    expect(getExternalTimeoutMs("TEST_TIMEOUT_MS", 5000)).toBe(1000);

    vi.stubEnv("TEST_TIMEOUT_MS", "120000");
    expect(getExternalTimeoutMs("TEST_TIMEOUT_MS", 5000)).toBe(60000);
  });

  it("recognizes abort and timeout errors", () => {
    const abort = new Error("aborted");
    abort.name = "AbortError";
    const timeout = new Error("timed out");
    timeout.name = "TimeoutError";

    expect(isTimeoutError(abort)).toBe(true);
    expect(isTimeoutError(timeout)).toBe(true);
    expect(isTimeoutError(new Error("other"))).toBe(false);
  });
});
