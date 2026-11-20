import { Copy, Phone, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Property } from "@/data/properties";
import { formatPrice, pricePerUnit } from "@/data/properties";
import { BUSINESS_PHONE_TEL, createWhatsAppUrl } from "@/lib/contact";
import WhatsAppIcon from "./WhatsAppIcon";

export default function PropertyAside({ property }: { property: Property }) {
  const isRental = property.operation === "Alquiler";
  const [commissionRate, setCommissionRate] = useState("3");
  const [additionalCosts, setAdditionalCosts] = useState("0");
  const estimate = useMemo(() => {
    const rate = Number(commissionRate);
    const costs = Number(additionalCosts);
    const commission = Number.isFinite(rate) && rate >= 0 ? property.price * rate / 100 : 0;
    const extra = Number.isFinite(costs) && costs >= 0 ? costs : 0;
    return { commission, extra, net: Math.max(0, property.price - commission - extra) };
  }, [additionalCosts, commissionRate, property.price]);

  const shareProperty = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: property.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Enlace copiado");
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(url);
          toast.success("Enlace copiado");
        } catch {
          toast.error("No se pudo copiar el enlace en este navegador.");
        }
      }
    }
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
          <a className="button button-primary" href={BUSINESS_PHONE_TEL}><Phone size={17} /> Contactar</a>
          <a className="button button-whatsapp" href={createWhatsAppUrl(`Hola, me interesa esta propiedad: ${property.title}.`)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={17} /> WhatsApp</a>
          <button className="button button-secondary" type="button" onClick={shareProperty}><Share2 size={17} /> Compartir</button>
        </div>
      </section>
      <section className="property-calculator" aria-labelledby="calculator-heading">
        <div className="calculator-heading"><div><span className="eyebrow">ESTIMACIÓN</span><h2 id="calculator-heading">Calculadora de operación</h2></div><span className="calculator-badge">Orientativa</span></div>
        <p className="calculator-intro">Ajustá los valores para entender cómo podría componerse el importe. No reemplaza una cotización profesional ni contempla impuestos o gastos de escritura.</p>
        <div className="calculator-fields"><label>Comisión estimada (%)<input type="number" min="0" max="100" step="0.1" value={commissionRate} onChange={(event) => setCommissionRate(event.target.value)} /></label><label>Otros gastos ({property.currency})<input type="number" min="0" step="100" value={additionalCosts} onChange={(event) => setAdditionalCosts(event.target.value)} /></label></div>
        <dl className="calculator-breakdown"><div><dt>Precio de referencia</dt><dd>{formatPrice(property.price, property.currency)}</dd></div><div><dt>Comisión ({commissionRate || "0"}%)</dt><dd>− {formatPrice(estimate.commission, property.currency)}</dd></div><div><dt>Otros gastos</dt><dd>− {formatPrice(estimate.extra, property.currency)}</dd></div></dl>
        <div className="calculator-result"><span>Importe estimado neto</span><strong>{formatPrice(estimate.net, property.currency)}</strong></div>
      </section>
      <button className="copy-link-button" type="button" onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); toast.success("Enlace copiado"); } catch { toast.error("No se pudo copiar el enlace."); } }}><Copy size={14} /> Copiar enlace de esta propiedad</button>
    </aside>
  );
}
