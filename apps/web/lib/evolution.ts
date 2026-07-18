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

export async function sendWhatsAppMedia(
  phone: string,
  mediaUrlOrBase64: string,
  mediatype: "image" | "document" | "audio" | "video",
  caption?: string,
) {
  if (!EVOLUTION_API_KEY || EVOLUTION_API_KEY === "COLOQUE_SUA_CHAVE_DA_EVOLUTION_API") {
    console.warn("[Evolution API] Mock mode: Sending MEDIA to", phone);
    return true;
  }

  const endpoint = `${EVOLUTION_API_URL}/message/sendMedia/${EVOLUTION_INSTANCE_NAME}`;

  try {
    const dataUrlMatch = mediaUrlOrBase64.match(/^data:([^;]+);base64,([\s\S]+)$/);
    const mimeType = dataUrlMatch?.[1]
      || (mediatype === "image" ? "image/png" : "application/octet-stream");
    const media = dataUrlMatch?.[2] || mediaUrlOrBase64;
    const extension = mimeType.split("/")[1]?.split(";")[0] || "bin";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: phone,
        mediatype,
        mimetype: mimeType,
        media,
        caption: caption || "",
        fileName: `relatorio-pila.${extension}`,
        delay: 1200,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[Evolution API] Error sending media:", response.status, errorBody);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Evolution API] Request failed:", error);
    return false;
  }
}
