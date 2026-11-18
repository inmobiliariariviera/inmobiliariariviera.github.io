import { createClient } from "@supabase/supabase-js";
import type { Property, PropertyStatus } from "@/data/properties";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export type PropertyRow = {
  id: string;
  slug: string;
  operation: "Venta" | "Alquiler";
  title: string;
  category: "Campo" | "Casa" | "Terreno" | "Departamento" | "Local" | "Otro";
  location: string;
  region: string;
  price: number | string;
  currency: "USD" | "ARS";
  price_frequency: string | null;
  surface: number | string;
  covered_surface: number | string | null;
  surface_unit: "ha" | "m²";
  bedrooms: number | null;
  bathrooms: number | null;
  rooms: number | null;
  legal_status: string;
  features: string[] | null;
  description: string;
  images: string[] | null;
  status: PropertyStatus;
  created_at: string;
  updated_at: string;
};

export function propertyFromRow(row: PropertyRow): Property {
  return {
    id: row.id,
    slug: row.slug,
    operation: row.operation,
    title: row.title,
    category: row.category,
    location: row.location,
    region: row.region,
    price: Number(row.price),
    currency: row.currency,
    priceFrequency: row.price_frequency ?? undefined,
    surface: Number(row.surface),
    coveredSurface: row.covered_surface == null ? undefined : Number(row.covered_surface),
    surfaceUnit: row.surface_unit,
    bedrooms: row.bedrooms ?? undefined,
    bathrooms: row.bathrooms ?? undefined,
    rooms: row.rooms ?? undefined,
    legalStatus: row.legal_status,
    features: row.features ?? [],
    description: row.description,
    images: row.images ?? [],
    demo: false,
    status: row.status,
  };
}

export function formatCurrency(amount: number, currency: "USD" | "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
