export type LocationScope = "all" | "traslasierra";

export const LOCATION_SCOPE_LABELS: Record<LocationScope, string> = {
  all: "Traslasierra · Córdoba",
  traslasierra: "Traslasierra · Córdoba",
};

const traslasierraLocalities = [
  "loma bola",
  "mina clavero",
  "nono",
  "villa cura brochero",
  "villa dolores",
  "san javier",
  "yacanto",
  "villa de las rosas",
  "las rabonas",
  "los hornillos",
  "las calles",
  "san lorenzo",
  "panaholma",
  "arroyo de los patos",
  "la poblacion",
  "luyaba",
  "la paz",
  "las tapias",
  "villa sarmiento",
  "los pozos",
  "san pedro",
  "la higuera",
  "san carlos minas",
];

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-AR");
}

export function normalizeLocationScope(value: string | null | undefined): LocationScope {
  return value === "traslasierra" ? value : "all";
}

export function propertyMatchesLocationScope(
  property: { location: string; region: string },
  scope: LocationScope = "all",
): boolean {
  const location = normalize(property.location);
  const region = normalize(property.region);
  const text = `${location} ${region}`;
  const isTraslasierra = region.includes("traslasierra") || (region.includes("cordoba") && traslasierraLocalities.some((locality) => location.includes(locality)));
  if (scope === "traslasierra") return isTraslasierra;
  return isTraslasierra;
}
