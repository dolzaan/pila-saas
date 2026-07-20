import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import {
  isProductEventName,
  isPublicProductEventName,
  recordProductEvent,
} from "@/lib/product-events";
import {
  checkRateLimits,
  getClientIp,
  privateRateLimitKey,
  RateLimitUnavailableError,
} from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { z } from "zod";

const EventSchema = z.object({
  eventName: z.string().trim().min(1).max(50),
  properties: z.record(
    z.union([z.string().max(100), z.number().finite(), z.boolean()]),
  ).optional(),
});

export async function POST(request: Request) {
  const payload = EventSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success || !isProductEventName(payload.data.eventName)) {
    return NextResponse.json({ accepted: false }, { status: 400 });
  }

  const session = await auth();
  const eventName = payload.data.eventName;
  if (!session?.user?.id && !isPublicProductEventName(eventName)) {
    return NextResponse.json({ accepted: false }, { status: 401 });
  }

  const cookieHeader = request.headers.get("cookie") || "";
  const visitorCookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("pila_visitor_id="))
    ?.split("=")[1];
  const visitorId = visitorCookie || randomUUID();

  try {
    const decision = await checkRateLimits([
      {
        key: privateRateLimitKey(
          "product-events",
          `${visitorId}:${getClientIp(request)}`,
        ),
        limit: 60,
        windowMs: 60 * 60 * 1_000,
      },
    ]);
    if (!decision.allowed) {
      return NextResponse.json({ accepted: false }, { status: 429 });
    }
  } catch (error) {
    if (!(error instanceof RateLimitUnavailableError)) throw error;
    // A ausência temporária do Redis não deve afetar a navegação.
    return NextResponse.json({ accepted: true }, { status: 202 });
  }

  await recordProductEvent({
    eventName,
    userId: session?.user?.id || null,
    visitorId,
    properties: payload.data.properties,
  });

  const response = NextResponse.json({ accepted: true }, { status: 202 });
  if (!visitorCookie) {
    response.cookies.set("pila_visitor_id", visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 180 * 24 * 60 * 60,
    });
  }
  return response;
}
