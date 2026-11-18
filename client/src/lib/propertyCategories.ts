export const PROPERTY_CATEGORIES = ["Campo", "Casa", "Terreno", "Departamento", "Local", "Otro"] as const;

export function normalizePropertyCategory(value: string | null) {
  return value && (PROPERTY_CATEGORIES as readonly string[]).includes(value) ? value : "Todas";
}
