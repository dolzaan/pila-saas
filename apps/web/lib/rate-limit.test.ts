import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkRateLimits,
  privateRateLimitKey,
  RateLimitUnavailableError,
} from "./rate-limit";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function configureEnvironment() {
  vi.stubEnv("AUTH_SECRET", "test-auth-secret");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.com");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
}

describe("persistent rate limiting", () => {
  it("creates anonymous and stable keys", () => {
    vi.stubEnv("AUTH_SECRET", "test-auth-secret");

    const first = privateRateLimitKey("auth:email", " User@Example.com ");
    const second = privateRateLimitKey("auth:email", "user@example.com");

    expect(first).toBe(second);
    expect(first).not.toContain("user@example.com");
  });

  it("allows requests while the Redis counter is within the limit", async () => {
    configureEnvironment();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ result: [2, 60_000] }]), {
        status: 200,
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const decision = await checkRateLimits([
      { key: "ai:ip:test", limit: 10, windowMs: 600_000 },
    ]);

    expect(decision).toEqual({
      allowed: true,
      limit: 10,
      remaining: 8,
      retryAfterSeconds: 60,
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("blocks requests after the limit and exposes the retry time", async () => {
    configureEnvironment();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([{ result: [11, 25_001] }]), {
          status: 200,
        })
      )
    );

    const decision = await checkRateLimits([
      { key: "ai:ip:test", limit: 10, windowMs: 600_000 },
    ]);

    expect(decision.allowed).toBe(false);
    expect(decision.remaining).toBe(0);
    expect(decision.retryAfterSeconds).toBe(26);
  });

  it("fails closed when persistent Redis is not configured", async () => {
    vi.stubEnv("AUTH_SECRET", "test-auth-secret");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

    await expect(
      checkRateLimits([
        { key: "ai:ip:test", limit: 10, windowMs: 600_000 },
      ])
    ).rejects.toBeInstanceOf(RateLimitUnavailableError);
  });
});
