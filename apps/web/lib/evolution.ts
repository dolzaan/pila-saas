const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "http://localhost:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";
const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || "FinZapBot";

export async function sendWhatsAppMessage(phone: string, text: string) {
  if (!EVOLUTION_API_KEY || EVOLUTION_API_KEY === "COLOQUE_SUA_CHAVE_DA_EVOLUTION_API") {
    console.warn("[Evolution API] Mock mode: Sending message to", phone);
    console.warn("[Evolution API] Message:", text);
    return true; // Mock success
  }

  const endpoint = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`;
  
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: phone,
        text: text,
        delay: 1200 // Adiciona um pequeno delay humano
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[Evolution API] Error sending message:", err);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Evolution API] Request failed:", error);
    return false;
  }
}

export async function sendWhatsAppMedia(phone: string, mediaUrlOrBase64: string, mediatype: "image" | "document" | "audio" | "video", caption?: string) {
  if (!EVOLUTION_API_KEY || EVOLUTION_API_KEY === "COLOQUE_SUA_CHAVE_DA_EVOLUTION_API") {
    console.warn("[Evolution API] Mock mode: Sending MEDIA to", phone);
    return true; // Mock success
  }

  const endpoint = `${EVOLUTION_API_URL}/message/sendMedia/${EVOLUTION_INSTANCE_NAME}`;
  
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: phone,
        mediatype: mediatype,
        mimetype: mediatype === "image" ? "image/png" : undefined,
        media: mediaUrlOrBase64,
        caption: caption || "",
        delay: 1200
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[Evolution API] Error sending media:", err);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Evolution API] Request failed:", error);
    return false;
  }
}

