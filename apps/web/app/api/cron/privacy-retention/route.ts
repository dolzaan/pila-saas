import { NextResponse } from "next/server";
import { runPrivacyRetention } from "@/lib/privacy-retention";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    console.error("[Cron Privacy Retention] CRON_SECRET não configurado");
    return NextResponse.json({ error: "Cron is not configured" }, { status: 503 });
  }

  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runPrivacyRetention();

    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[Cron Privacy Retention] Falha:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
