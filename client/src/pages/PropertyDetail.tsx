import { useParams, Link } from "wouter";
import { BedDouble, Check, ChevronRight, Heart, MapPin, Ruler, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import SiteHeader from "@/components/real-estate/SiteHeader";
import SiteFooter from "@/components/real-estate/SiteFooter";
import PropertyGallery from "@/components/real-estate/PropertyGallery";
import PropertyAside from "@/components/real-estate/PropertyAside";
import LeadInquiryForm from "@/components/real-estate/LeadInquiryForm";
import NotFound from "@/pages/NotFound";
import { formatPrice, formatUnit, pricePerUnit } from "@/data/properties";
import { usePublicProperties } from "@/lib/usePublicProperties";
import { toast } from "sonner";

export default function PropertyDetail() {
  const { slug } = useParams();
  const { properties, loading, error } = usePublicProperties();
  const property = properties.find((item) => item.slug === (slug ?? ""));
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [slug]);
  if (loading) return <div className="app-shell"><SiteHeader/><main className="detail-page"><div className="empty-state"><p>Cargando propiedad…</p></div></main></div>;
  if (error) return <div className="app-shell"><SiteHeader/><main className="detail-page"><div className="empty-state"><h2>No pudimos cargar esta propiedad.</h2><p>Revisá la conexión con Supabase e intentá nuevamente.</p><Link href="/">Volver al catálogo</Link></div></main></div>;
  if (!property) return <NotFound />;

  const totalSquareMeters = property.surfaceUnit === "ha" ? property.surface * 10000 : property.surface;
  const technicalFacts = [
    ["Superficie total", `${totalSquareMeters.toLocaleString("es-AR")} m²`],
    ["Superficie", `${property.surface.toLocaleString("es-AR")} ${property.surfaceUnit === "ha" ? "hectáreas" : "m²"}`],
    ["Superficie cubierta", property.coveredSurface && property.coveredSurface > 0 ? `${property.coveredSurface.toLocaleString("es-AR")} m²` : "A consultar"],
    ...(property.rooms ? [["Ambientes", `${property.rooms}${property.demo ? " (dato de muestra)" : ""}`]] : []),
    ["Operación", property.operation],
    ["Documentación", property.legalStatus],
    ...(property.bedrooms ? [["Dormitorios", String(property.bedrooms)]] : []),
    ...(property.bathrooms ? [["Baños", String(property.bathrooms)]] : []),
    ["Características", property.features.join(" · ")],
  ];

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: property.title, url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); toast.success("Enlace copiado"); }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") toast.error("No se pudo compartir la publicación.");
    }
  };

  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="detail-page">
        <nav className="breadcrumbs" aria-label="Ruta de navegación">
          <Link href="/">Inicio</Link><ChevronRight size={14} /><span>{property.region.split(",")[0]}</span><ChevronRight size={14} /><span>{property.location.split(",").at(-1)?.trim()}</span><ChevronRight size={14} /><strong>{property.category}</strong>
        </nav>
        <div className="detail-title-row" data-scroll-reveal>
          <div>
            <div className="detail-badges">{!property.demo && (property.status === "sold" ? <span className="property-status-sold">VENDIDO</span> : property.status === "rented" ? <span className="property-status-rented">ALQUILADO</span> : property.status === "published" ? <span className="property-status-published">PUBLICADO</span> : null)}<span className="document-badge"><Check size={13} /> {property.legalStatus}</span></div>
            <h1>{property.title}</h1>
            <p className="detail-location"><MapPin size={17} /> {property.location}, {property.region}</p>
          </div>
          <button className={`save-property ${saved ? "is-saved" : ""}`} type="button" aria-label={saved ? "Quitar de favoritos" : "Guardar propiedad"} aria-pressed={saved} onClick={() => { setSaved(!saved); toast.success(saved ? "Quitado de guardados" : "Guardado en este dispositivo"); }}><Heart size={19} fill={saved ? "currentColor" : "none"} /></button>
        </div>

        <div className="detail-tags" data-scroll-reveal><span className="tag-strong">{property.surface.toLocaleString("es-AR")} {property.surfaceUnit}</span><span>{property.category}</span><span>{property.legalStatus}</span>{property.bedrooms && <span><BedDouble size={14} /> {property.bedrooms} dormitorios</span>}{property.operation === "Alquiler" ? <span><Ruler size={14} /> {formatPrice(property.price, property.currency)} / mes</span> : <span><Ruler size={14} /> {formatPrice(pricePerUnit(property), property.currency)} / {formatUnit(property)}</span>}</div>

        <div className="detail-layout" data-scroll-reveal>
          <div className="detail-main-column">
            <PropertyGallery images={property.images} title={property.title} />
            <section className="detail-content-card">
              <div className="content-card-header"><div><span className="eyebrow">DETALLES DE LA PROPIEDAD</span><h2>Una descripción clara del lugar.</h2></div><button className="text-share" type="button" onClick={share}><Share2 size={16} /> Compartir</button></div>
              <section className="description-block"><h3>Descripción</h3><p className="property-description">{property.description}</p></section>
              <div className="feature-list">{property.features.map((feature) => <span key={feature}><Check size={15} /> {feature}</span>)}</div>
              <section className="technical-sheet" aria-labelledby="technical-sheet-heading">
                <h3 id="technical-sheet-heading">Ficha técnica</h3>
                <dl>
                  {technicalFacts.map(([label, value]) => <div className="technical-row" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
                </dl>
              </section>
            </section>
            {!property.demo && <LeadInquiryForm propertyId={property.id} propertyTitle={property.title} />}
          </div>
          <PropertyAside property={property} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
