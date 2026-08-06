import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type VercelConfig = {
  crons?: Array<{ path: string; schedule: string }>;
};

describe("Vercel Hobby cron configuration", () => {
  it("mantém no máximo dois agendamentos, ambos diários", () => {
    const config = JSON.parse(
      readFileSync(resolve(process.cwd(), "vercel.json"), "utf8"),
    ) as VercelConfig;

    expect(config.crons).toEqual([
      { path: "/api/cron/reminders", schedule: "0 12 * * *" },
      { path: "/api/cron/whatsapp-outbox", schedule: "0 3 * * *" },
    ]);
  });
});
