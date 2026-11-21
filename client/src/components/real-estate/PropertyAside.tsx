import { Copy, MessageSquareText, Phone, Share2 } from "lucide-react";
import { toast } from "sonner";
import type { Property } from "@/data/properties";
import { formatPrice, pricePerUnit } from "@/data/properties";
import { BUSINESS_PHONE_DISPLAY, BUSINESS_PHONE_TEL, createWhatsAppUrl } from "@/lib/contact";
import { propertyPublicUrl, propertyShareText } from "@/lib/propertyMeta";
import WhatsAppIcon from "./WhatsAppIcon";

export default function PropertyAside({ property }: { property: Property }) {
  const isRental = property.operation === "Alquiler";
  const url = propertyPublicUrl(property);
  const shareText = propertyShareText(property, url);

  const scrollToInquiry = () => {
    const inquiry = document.getElementById("property-inquiry-form");
    if (!inquiry) {
      window.open(createWhatsAppUrl(`Hola, me interesa consultar por ${property.title}.`), "_blank", "noopener,noreferrer");
      return;
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    inquiry.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    window.setTimeout(() => document.getElementById("lead-name")?.focus({ preventScroll: true }), reducedMotion ? 0 : 500);
  };

  const shareProperty = async () => {
    try {
      if (navigator.share) await navigator.share({ title: property.title, text: shareText, url });
      else { await navigator.clipboard.writeText(url); toast.success("Enlace de la propiedad copiado."); }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") toast.error("No se pudo compartir la publicación.");
    }
  };

  const copyPropertyUrl = async () => {
    try { await navigator.clipboard.writeText(url); toast.success("Enlace canónico de la propiedad copiado."); }
    catch { toast.error("No se pudo copiar el enlace en este navegador."); }
  };

  return (
    <aside className="property-aside">
      <section className="price-card">
        <div className="price-card-top">
          <span className="eyebrow">{isRental ? "Precio de alquiler" : "Precio de venta"}</span>
          <div className="price-per-unit">
            <small>{isRental ? `${property.currency} / mes` : `${property.currency} / ${property.surfaceUnit}`}</small>
            <strong>{isRental ? formatPrice(property.price, property.currency) : formatPrice(pricePerUnit(property), property.currency)}</strong>
          </div>
        </div>
        <p className="price-total">{formatPrice(property.price, property.currency)}{isRental && <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: 0 }}> / mes</span>}</p>
        <div className="price-badges">
          <span>{property.operation}</span>
          {!property.demo && property.status === "sold" && <span className="property-status-sold">Vendido</span>}
          {!property.demo && property.status === "rented" && <span className="property-status-rented">Alquilado</span>}
          {!property.demo && property.status === "published" && <span className="property-status-published">Publicado</span>}
        </div>
        <div className="contact-actions">
          {!property.demo ? <button className="button button-primary property-inquiry-cta" type="button" onClick={scrollToInquiry}><MessageSquareText size={17} /> Consultar esta propiedad</button> : <a className="button button-primary" href={BUSINESS_PHONE_TEL}><Phone size={17} /> Contactar</a>}
          <a className="button button-whatsapp" href={createWhatsAppUrl(`Hola, me interesa esta propiedad: ${property.title}.`)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={17} /> WhatsApp</a>
          <a className="button button-secondary property-whatsapp-share" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={17} /> Compartir por WhatsApp</a>
          <button className="button button-secondary" type="button" onClick={shareProperty}><Share2 size={17} /> Compartir</button>
        </div>
        {!property.demo && <a className="property-phone-link" href={BUSINESS_PHONE_TEL}><Phone size={14} /> También podés llamarnos: {BUSINESS_PHONE_DISPLAY}</a>}
      </section>
      <button className="copy-link-button" type="button" onClick={() => void copyPropertyUrl()}><Copy size={14} /> Copiar enlace de esta propiedad</button>
    </aside>
  );
}
