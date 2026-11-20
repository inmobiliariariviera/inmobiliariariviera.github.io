import { ArrowUpRight, BedDouble, MapPin, Ruler } from "lucide-react";
import { Link } from "wouter";
import type { Property } from "@/data/properties";
import { formatPrice } from "@/data/properties";

export default function PropertyCard({ property }: { property: Property }) {
  return (
    <article className="property-card">
      <Link href={`/propiedad/${property.slug}`} className="property-card-link" aria-label={`Ver ${property.title}`}>
        <div className="property-card-image-wrap">
          <img className="property-card-image" src={property.images[0]} alt={property.demo ? `${property.category} — fotografía ilustrativa` : property.title} loading="lazy" />
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
      </Link>
    </article>
  );
}
