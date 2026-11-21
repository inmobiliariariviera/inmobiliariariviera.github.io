import { describe, expect, it } from "vitest";
import { properties } from "@/data/properties";
import { countActivePropertyFilters, DEFAULT_PROPERTY_FILTERS, matchesPropertyFilters } from "@/lib/propertyFilters";

describe("matchesPropertyFilters", () => {
  it("combina operación, categoría y zona", () => {
    const property = properties.find((item) => item.slug === "casa-rural-alquiler-san-javier")!;
    expect(matchesPropertyFilters(property, { ...DEFAULT_PROPERTY_FILTERS, operation: "Alquiler", category: "Casa", locationScope: "traslasierra" })).toBe(true);
    expect(matchesPropertyFilters(property, { ...DEFAULT_PROPERTY_FILTERS, operation: "Venta" })).toBe(false);
  });

  it("aplica precio y moneda sin convertir divisas", () => {
    const property = properties.find((item) => item.slug === "campo-loma-bola-san-javier")!;
    expect(matchesPropertyFilters(property, { ...DEFAULT_PROPERTY_FILTERS, priceCurrency: "USD", priceMin: "90000", priceMax: "100000" })).toBe(true);
    expect(matchesPropertyFilters(property, { ...DEFAULT_PROPERTY_FILTERS, priceCurrency: "ARS", priceMin: "90000" })).toBe(false);
    expect(matchesPropertyFilters(property, { ...DEFAULT_PROPERTY_FILTERS, priceMin: "90000" })).toBe(false);
  });

  it("compara la superficie en m² equivalentes, también para hectáreas", () => {
    const property = properties.find((item) => item.slug === "campo-loma-bola-san-javier")!;
    expect(matchesPropertyFilters(property, { ...DEFAULT_PROPERTY_FILTERS, surfaceMin: "29999", surfaceMax: "30001" })).toBe(true);
    expect(matchesPropertyFilters(property, { ...DEFAULT_PROPERTY_FILTERS, surfaceMin: "30001" })).toBe(false);
  });

  it("cuenta sólo los criterios activos", () => {
    expect(countActivePropertyFilters(DEFAULT_PROPERTY_FILTERS)).toBe(0);
    expect(countActivePropertyFilters({ ...DEFAULT_PROPERTY_FILTERS, operation: "Venta", priceMin: "1", surfaceMax: "200" })).toBe(3);
  });
});
