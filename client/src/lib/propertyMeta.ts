import type { Property } from "@/data/properties";

export const PUBLIC_SITE_URL = (import.meta.env.VITE_PUBLIC_SITE_URL || "https://inmobiliariariviera.github.io").replace(/\/+$/, "");
export const BRAND_IMAGE_URL = new URL("/riviera-brand-mark.png", PUBLIC_SITE_URL).href;

export function propertyPublicUrl(property: Pick<Property, "slug" | "demo">): string {
  const slug = encodeURIComponent(property.slug);
  return property.demo
    ? `${PUBLIC_SITE_URL}/#/${"propiedad"}/${slug}`
    : `${PUBLIC_SITE_URL}/propiedad/${slug}/`;
}

export function propertyMetaImage(property: Pick<Property, "images">): string {
  const candidate = property.images.find((image) => image.trim());
  if (!candidate) return BRAND_IMAGE_URL;
  try {
    const image = new URL(candidate, PUBLIC_SITE_URL);
    const privateOrSignedPath = /\/storage\/v1\/object\/(?:sign|authenticated)\//i.test(image.pathname);
    if (image.protocol !== "https:" || image.username || image.password || image.search || image.hash || privateOrSignedPath) return BRAND_IMAGE_URL;
    return image.href;
  } catch {
    return BRAND_IMAGE_URL;
  }
}

function shortDescription(value: string, maxLength = 155): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function propertyMetaDescription(property: Property): string {
  const summary = property.description.trim()
    ? property.description
    : `${property.operation} de ${property.category.toLowerCase()} en ${property.location}, ${property.region}.`;
  return shortDescription(`${summary} ${property.operation} · ${property.location}.`);
}

export function propertyShareText(property: Property, url = propertyPublicUrl(property)): string {
  const surface = `${property.surface.toLocaleString("es-AR")} ${property.surfaceUnit}`;
  const price = new Intl.NumberFormat("es-AR", { style: "currency", currency: property.currency, maximumFractionDigits: 0 }).format(property.price);
  const frequency = property.priceFrequency ? ` / ${property.priceFrequency}` : "";
  return [
    property.title,
    `${property.operation} · ${property.category} · ${property.location}, ${property.region}`,
    `${price}${frequency} · ${surface}`,
    "RIVIERA Inmobiliaria",
    url,
  ].join("\n");
}
