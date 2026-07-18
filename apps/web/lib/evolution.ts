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
    let blob: Blob;
    let mimeType = mediatype === "image" ? "image/png" : "application/octet-stream";

    const dataUrlMatch = mediaUrlOrBase64.match(/^data:([^;]+);base64,(.+)$/s);
    if (dataUrlMatch) {
      mimeType = dataUrlMatch[1];
      const bytes = new Uint8Array(Buffer.from(dataUrlMatch[2], "base64"));
      blob = new Blob([bytes], { type: mimeType });
    } else {
      const mediaResponse = await fetch(mediaUrlOrBase64);
      if (!mediaResponse.ok) {
        throw new Error(`Falha ao baixar mídia: HTTP ${mediaResponse.status}`);
      }
      mimeType = mediaResponse.headers.get("content-type") || mimeType;
      blob = new Blob([await mediaResponse.arrayBuffer()], { type: mimeType });
    }

    const extension = mimeType.split("/")[1]?.split(";")[0] || "bin";
    const form = new FormData();
    form.append("number", phone);
    form.append("mediatype", mediatype);
    form.append("media", blob, `relatorio-pila.${extension}`);
    form.append("caption", caption || "");
    form.append("fileName", `relatorio-pila.${extension}`);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "apikey": EVOLUTION_API_KEY },
      body: form,
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
