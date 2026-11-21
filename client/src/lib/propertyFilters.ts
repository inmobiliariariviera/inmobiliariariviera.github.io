import type { Property } from "@/data/properties";
import type { LocationScope } from "@/lib/locationScopes";
import { propertyMatchesLocationScope } from "@/lib/locationScopes";

export type PropertyOperationFilter = "Todas" | "Venta" | "Alquiler";
export type PropertyCategoryFilter = Property["category"] | "Todas";
export type PropertyFilters = {
  operation: PropertyOperationFilter;
  category: PropertyCategoryFilter;
  locationScope: LocationScope;
  priceCurrency: "all" | "USD" | "ARS";
  priceMin: string;
  priceMax: string;
  surfaceMin: string;
  surfaceMax: string;
};

export const DEFAULT_PROPERTY_FILTERS: PropertyFilters = {
  operation: "Todas",
  category: "Todas",
  locationScope: "all",
  priceCurrency: "all",
  priceMin: "",
  priceMax: "",
  surfaceMin: "",
  surfaceMax: "",
};

function numericFilter(value: string): number | null {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function surfaceInSquareMeters(property: Property): number {
  return property.surfaceUnit === "ha" ? property.surface * 10_000 : property.surface;
}

export function matchesPropertyFilters(property: Property, filters: PropertyFilters, searchText = ""): boolean {
  if (filters.operation !== "Todas" && property.operation !== filters.operation) return false;
  if (filters.category !== "Todas" && property.category !== filters.category) return false;
  if (!propertyMatchesLocationScope(property, filters.locationScope)) return false;
  if (filters.priceCurrency !== "all" && property.currency !== filters.priceCurrency) return false;

  const priceMin = numericFilter(filters.priceMin);
  const priceMax = numericFilter(filters.priceMax);
  if (filters.priceCurrency === "all" && (priceMin !== null || priceMax !== null)) return false;
  if (priceMin !== null && property.price < priceMin) return false;
  if (priceMax !== null && property.price > priceMax) return false;

  const surface = surfaceInSquareMeters(property);
  const surfaceMin = numericFilter(filters.surfaceMin);
  const surfaceMax = numericFilter(filters.surfaceMax);
  if (surfaceMin !== null && surface < surfaceMin) return false;
  if (surfaceMax !== null && surface > surfaceMax) return false;

  const normalizedSearch = searchText.trim().toLocaleLowerCase("es-AR");
  if (!normalizedSearch) return true;
  const haystack = `${property.title} ${property.location} ${property.region} ${property.category} ${property.features.join(" ")}`.toLocaleLowerCase("es-AR");
  return haystack.includes(normalizedSearch);
}

export function countActivePropertyFilters(filters: PropertyFilters): number {
  return Number(filters.operation !== "Todas")
    + Number(filters.category !== "Todas")
    + Number(filters.locationScope !== "all")
    + Number(filters.priceCurrency !== "all")
    + Number(Boolean(filters.priceMin.trim()))
    + Number(Boolean(filters.priceMax.trim()))
    + Number(Boolean(filters.surfaceMin.trim()))
    + Number(Boolean(filters.surfaceMax.trim()));
}
