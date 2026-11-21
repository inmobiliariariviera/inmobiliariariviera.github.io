export const BUSINESS_PHONE_DISPLAY = "+54 9 3544 631553";
export const BUSINESS_PHONE_TEL = "tel:+5493544631553";
export const BUSINESS_EMAIL = "inmobiliariavirieraok@gmail.com";

// Número argentino en formato internacional de WhatsApp: país + móvil + área/número.
const WHATSAPP_NUMBER = "5493544631553";

export function createWhatsAppUrl(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
