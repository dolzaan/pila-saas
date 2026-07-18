"use server";

import { revalidatePath } from "next/cache";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "http://localhost:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";
const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || "FinZapBot";

function getWebhookConfig() {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "").replace(/\/$/, "");
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!appUrl || !secret) {
    throw new Error("NEXT_PUBLIC_APP_URL/APP_URL e WHATSAPP_WEBHOOK_SECRET precisam estar configurados");
  }
  return {
    url: `${appUrl}/api/webhooks/whatsapp`,
    headers: { "x-pila-webhook-secret": secret },
  };
}

const headers = {
  "Content-Type": "application/json",
  "apikey": EVOLUTION_API_KEY,
};

async function setSecureWebhook(webhook: ReturnType<typeof getWebhookConfig>) {
  const response = await fetch(`${EVOLUTION_API_URL}/webhook/set/${EVOLUTION_INSTANCE_NAME}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      webhook: {
        enabled: true,
        url: webhook.url,
        headers: webhook.headers,
        byEvents: false,
        base64: true,
        events: ["MESSAGES_UPSERT"],
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`Falha ao configurar webhook seguro: ${await response.text()}`);
  }
}

export async function getWhatsAppStatus() {
  try {
    const res = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${EVOLUTION_INSTANCE_NAME}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      if (res.status === 404) {
        return { state: "not_created" };
      }
      return { state: "error", message: "Failed to fetch status" };
    }

    const data = await res.json();
    // state can be "open", "connecting", "close"
    return { state: data?.instance?.state || "unknown" };
  } catch (error) {
    console.error("[Evolution API] Error getting status:", error);
    return { state: "error", message: "Connection refused" };
  }
}

export async function connectWhatsApp() {
  try {
    const webhook = getWebhookConfig();
    // 1. Try to fetch state first
    const stateRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${EVOLUTION_INSTANCE_NAME}`, {
      method: "GET",
      headers,
    });

    if (stateRes.status === 404) {
      // Instance doesn't exist, create it
      const createRes = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          instanceName: EVOLUTION_INSTANCE_NAME,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS"
        })
      });

      if (!createRes.ok) {
        throw new Error(`Failed to create instance: ${await createRes.text()}`);
      }

      const createData = await createRes.json();
      
      await setSecureWebhook(webhook);

      return { success: true, qrcode: createData.qrcode?.base64 || createData.qrcode?.base64 };
    }

    // Atualiza o webhook mesmo quando a instância já está conectada.
    await setSecureWebhook(webhook);

    // 2. Instance exists, try to connect
    const connectRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/${EVOLUTION_INSTANCE_NAME}`, {
      method: "GET",
      headers,
    });

    if (!connectRes.ok) {
      // Might be already connected
      if (connectRes.status === 401 || connectRes.status === 400) {
        return { success: false, message: "Instância já está conectada ou conectando." };
      }
      throw new Error(`Failed to connect instance: ${await connectRes.text()}`);
    }

    const connectData = await connectRes.json();
    
    return { success: true, qrcode: connectData.base64 };

  } catch (error: any) {
    console.error("[Evolution API] Connect error:", error);
    return { success: false, message: error.message || "Erro interno" };
  }
}

export async function logoutWhatsApp() {
  try {
    const res = await fetch(`${EVOLUTION_API_URL}/instance/logout/${EVOLUTION_INSTANCE_NAME}`, {
      method: "DELETE",
      headers,
    });
    
    if (!res.ok) {
      throw new Error(await res.text());
    }
    
    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to logout" };
  }
}

export async function sendWhatsAppMessage(number: string, text: string) {
  try {
    const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        number,
        text,
        delay: 1200
      })
    });
    return res.ok;
  } catch (error) {
    console.error("[Evolution API] Erro ao enviar mensagem:", error);
    return false;
  }
}
