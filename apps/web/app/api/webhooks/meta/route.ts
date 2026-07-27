import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  const verifyToken = process.env.META_WHATSAPP_VERIFY_TOKEN;

  if (!verifyToken) {
    console.error("[Meta webhook] META_WHATSAPP_VERIFY_TOKEN não configurado");

    return NextResponse.json(
      { error: "Webhook da Meta não configurado" },
      { status: 500 },
    );
  }

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  return NextResponse.json(
    { error: "Token de verificação inválido" },
    { status: 403 },
  );
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    console.info("[Meta webhook] Evento recebido", {
      object: payload?.object,
      entries: Array.isArray(payload?.entry) ? payload.entry.length : 0,
    });

    // A Meta exige resposta 200 rápida. O processamento das mensagens
    // será conectado ao fluxo do Pila em uma etapa posterior.
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[Meta webhook] Payload inválido", error);

    return NextResponse.json(
      { error: "Payload inválido" },
      { status: 400 },
    );
  }
}
