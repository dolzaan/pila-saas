import { NextResponse } from "next/server";
import { createRequestId, logger } from "@/lib/logger";
import { getServiceHealthReport } from "@/lib/service-health";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = createRequestId();
  const report = await getServiceHealthReport();
  const statusCode = report.status === "UNAVAILABLE" ? 503 : 200;

  if (report.status !== "OPERATIONAL") {
    logger.warn("service_health_degraded", {
      requestId,
      status: report.status,
      services: Object.fromEntries(
        Object.entries(report.services).map(([name, service]) => [
          name,
          service.status,
        ]),
      ),
    });
  }

  return NextResponse.json(
    {
      status: report.status,
      checkedAt: report.checkedAt,
      requestId,
      services: Object.fromEntries(
        Object.entries(report.services).map(([name, service]) => [
          name,
          {
            status: service.status,
            latencyMs: service.latencyMs,
          },
        ]),
      ),
    },
    {
      status: statusCode,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Request-Id": requestId,
      },
    },
  );
}
