import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/lib/evolution";
import {
  buildUnlinkedGreetingReply,
  buildUnlinkedWhatsappReply,
  buildWhatsappAccessCheckFailureReply,
  buildWhatsappLinkHelpReply,
  type WhatsappGateReplyKind,
} from "@/lib/whatsapp-access-gate";
import {
  claimWhatsappInboundMessage,
  completeWhatsappInboundMessage,
  failWhatsappInboundMessage,
} from "@/lib/whatsapp-inbound";

const REPLY_KINDS = new Set<WhatsappGateReplyKind>([
  "GREETING",
  "UNLINKED",
  "LINK_HELP",
  "CHECK_FAILED",
]);

function secretsMatch(provided: string | null, expected: string) {
  if (!provided) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length
    && timingSafeEqual(providedBuffer, expectedBuffer);
}

function buildReply(replyKind: WhatsappGateReplyKind) {
  if (replyKind === "GREETING") return buildUnlinkedGreetingReply();
  if (replyKind === "LINK_HELP") return buildWhatsappLinkHelpReply();
  if (replyKind === "CHECK_FAILED") return buildWhatsappAccessCheckFailureReply();
  return buildUnlinkedWhatsappReply();
}

export async function POST(request: Request) {
  const expectedSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (
    !expectedSecret
    || !secretsMatch(request.headers.get("x-pila-webhook-secret"), expectedSecret)
  ) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const payload = await request.json().catch(() => null) as {
    remoteJid?: unknown;
    messageId?: unknown;
    replyKind?: unknown;
  } | null;

  const remoteJid = typeof payload?.remoteJid === "string"
    ? payload.remoteJid.trim()
    : "";
  const messageId = typeof payload?.messageId === "string"
    ? payload.messageId.trim()
    : "";
  const replyKind = typeof payload?.replyKind === "string"
    ? payload.replyKind as WhatsappGateReplyKind
    : null;

  if (
    !/^\d{10,15}@(s\.whatsapp\.net|c\.us)$/.test(remoteJid)
    || !messageId
    || messageId.length > 200
    || !replyKind
    || !REPLY_KINDS.has(replyKind)
  ) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  let claimed = false;

  try {
    const phone = remoteJid.split("@")[0];
    const claim = await claimWhatsappInboundMessage(messageId, phone);

    if (claim.state === "COMPLETED") {
      return NextResponse.json({ success: true, duplicate: true });
    }
    if (claim.state === "PROCESSING") {
      return NextResponse.json(
        { success: false, retryable: true },
        { status: 503, headers: { "Retry-After": "30" } },
      );
    }

    claimed = true;
    const sent = await sendWhatsAppMessage(remoteJid, buildReply(replyKind));
    await completeWhatsappInboundMessage(messageId);

    return NextResponse.json({ success: true, sent });
  } catch (error) {
    if (claimed) {
      try {
        await failWhatsappInboundMessage(messageId, error);
      } catch (stateError) {
        console.error("[WhatsApp Gate Reply] Falha ao registrar erro:", stateError);
      }
    }

    console.error("[WhatsApp Gate Reply] Erro:", error);
    return NextResponse.json(
      { success: false, retryable: true },
      { status: 503, headers: { "Retry-After": "30" } },
    );
  }
}
