export type PropertyStatus = "draft" | "published" | "sold" | "rented" | "archived";
export type Property = {
  id?: string;
  slug: string;
  operation: "Venta" | "Alquiler";
  title: string;
  category: "Campo" | "Casa" | "Terreno" | "Departamento" | "Local" | "Otro";
  location: string;
  region: string;
  price: number;
  currency: "USD" | "ARS";
  priceFrequency?: string;
  surface: number;
  coveredSurface?: number;
  surfaceUnit: "ha" | "m²";
  bedrooms?: number;
  bathrooms?: number;
  rooms?: number;
  legalStatus: string;
  features: string[];
  description: string;
  images: string[];
  demo: boolean;
  status?: PropertyStatus;
};

export const properties: Property[] = [
  {
    slug: "campo-loma-bola-san-javier",
    operation: "Venta",
    title: "Campo de 3 hectáreas con arroyo propio en Loma Bola",
    category: "Campo",
    location: "Loma Bola, San Javier",
    region: "Valle de Traslasierra, Córdoba",
    price: 96000,
    currency: "USD",
    surface: 3,
    surfaceUnit: "ha",
    legalStatus: "Escritura",
    features: ["Agua de riego", "Arroyo", "Acceso de ripio"],
    description:
      "Aviso de demostración para mostrar cómo se vería una publicación rural en el portal. La ubicación, el precio y las características son ilustrativos y deben reemplazarse por los datos confirmados de la inmobiliaria.",
    images: [],
    demo: true,
  },
  {
    slug: "casa-rural-san-javier",
    operation: "Venta",
    title: "Casa de campo con galería y arboleda",
    category: "Casa",
    location: "San Javier",
    region: "Valle de Traslasierra, Córdoba",
    price: 142000,
    currency: "USD",
    surface: 125,
    surfaceUnit: "m²",
    bedrooms: 2,
    bathrooms: 1,
    rooms: 4,
    legalStatus: "Escritura",
    features: ["Galería", "Parque arbolado", "Servicios"],
    description:
      "Ficha ilustrativa de una casa rural. Los datos no representan una propiedad real ni están disponibles para visita.",
    images: [],
    demo: true,
  },
  {
    slug: "terreno-vista-sierras",
    operation: "Venta",
    title: "Terreno con vista abierta a las sierras",
    category: "Terreno",
    location: "Las Rabonas",
    region: "Valle de Traslasierra, Córdoba",
    price: 42000,
    currency: "USD",
    surface: 1200,
    surfaceUnit: "m²",
    legalStatus: "Documentación a verificar",
    features: ["Vista a las sierras", "Arboleda", "Entorno tranquilo"],
    description:
      "Publicación de muestra para presentar terrenos dentro del catálogo. Confirmar superficie, documentación y servicios antes de publicar un aviso real.",
    images: [],
    demo: true,
  },
  {
    slug: "casa-rural-alquiler-san-javier",
    operation: "Alquiler",
    title: "Casa rural con patio para alquiler anual",
    category: "Casa",
    location: "San Javier",
    region: "Valle de Traslasierra, Córdoba",
    price: 450,
    currency: "USD",
    priceFrequency: "mes",
    surface: 95,
    surfaceUnit: "m²",
    bedrooms: 2,
    bathrooms: 1,
    rooms: 4,
    legalStatus: "Contrato anual",
    features: ["Patio", "Dos dormitorios", "Entorno rural"],
    description:
      "Ejemplo de aviso de alquiler mensual. El monto, el plazo y los datos de ubicación son ilustrativos y deben reemplazarse por información real antes de publicar.",
    images: [],
    demo: true,
  },
];

export const getProperty = (slug: string) => properties.find((property) => property.slug === slug);

export const formatPrice = (amount: number, currency = "USD") =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

export const formatUnit = (property: Property) =>
  property.surfaceUnit === "ha" ? "hectárea" : "m²";

export const pricePerUnit = (property: Property) => property.price / property.surface;
