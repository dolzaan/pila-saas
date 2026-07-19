const rawWhatsappNumber = process.env.NEXT_PUBLIC_PILA_WHATSAPP_NUMBER ?? "";

export const PILA_WHATSAPP_NUMBER = rawWhatsappNumber.replace(/\D/g, "");

export const PILA_WHATSAPP_DISPLAY = PILA_WHATSAPP_NUMBER
  ? `+${PILA_WHATSAPP_NUMBER.slice(0, 2)} ${PILA_WHATSAPP_NUMBER.slice(2, 4)} ${PILA_WHATSAPP_NUMBER.slice(4)}`
  : "WhatsApp do Pila";

export function getPilaWhatsappUrl(message = "Olá, Pila! Quero começar a controlar minhas finanças pelo WhatsApp.") {
  if (!PILA_WHATSAPP_NUMBER) return "/dashboard/whatsapp";

  return `https://wa.me/${PILA_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
