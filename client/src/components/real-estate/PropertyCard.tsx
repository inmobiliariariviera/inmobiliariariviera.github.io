import { ArrowUpRight, BedDouble, MapPin, Ruler } from "lucide-react";
import type { Property } from "@/data/properties";
import { formatPrice } from "@/data/properties";
import ProgressiveImage from "@/components/real-estate/ProgressiveImage";

export default function PropertyCard({ property }: { property: Property }) {
  const propertyHref = property.demo ? `/#/propiedad/${encodeURIComponent(property.slug)}` : `/propiedad/${encodeURIComponent(property.slug)}/`;
  return (
    <article className="property-card">
      <a href={propertyHref} className="property-card-link" aria-label={`Ver ${property.title}`}>
        <div className="property-card-image-wrap">
          <ProgressiveImage className="property-card-image" src={property.images[0]} alt={property.demo ? `${property.category} — fotografía ilustrativa` : `Fotografía de ${property.title}`} unavailableLabel={`Foto no disponible para ${property.title}`} />
          {!property.demo && <span className={`demo-ribbon listing-status-${property.status ?? "published"}`}>{property.status === "sold" ? "Vendido" : property.status === "rented" ? "Alquilado" : "Publicado"}</span>}
          <span className="operation-pill">{property.operation}</span>
        </div>
        <div className="property-card-body">
          <div className="card-location"><MapPin size={14} /> {property.location}</div>
          <h3>{property.title}</h3>
          <div className="property-card-meta">
            <span><Ruler size={15} /> {property.surface.toLocaleString("es-AR")} {property.surfaceUnit}</span>
            {property.bedrooms ? <span><BedDouble size={15} /> {property.bedrooms} dorm.</span> : <span>{property.category}</span>}
          </div>
          <div className="property-card-footer">
            <strong>{formatPrice(property.price, property.currency)}{property.priceFrequency && <small> / {property.priceFrequency}</small>}</strong>
            <span className="card-open"><ArrowUpRight size={17} /></span>
          </div>
        </div>
      </a>
    </article>
  );
}
