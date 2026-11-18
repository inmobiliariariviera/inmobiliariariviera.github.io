import { describe, expect, it } from "vitest";
import { LOCATION_SCOPE_LABELS, normalizeLocationScope, propertyMatchesLocationScope } from "./locationScopes";

describe("propertyMatchesLocationScope", () => {
  it("accepts Traslasierra properties in Córdoba", () => {
    const property = { location: "Villa de las Rosas", region: "Valle de Traslasierra, Córdoba" };
    expect(propertyMatchesLocationScope(property)).toBe(true);
    expect(propertyMatchesLocationScope(property, "traslasierra")).toBe(true);
    expect(propertyMatchesLocationScope(property, "merlo")).toBe(false);
  });

  it("accepts a listed locality when its region is Córdoba", () => {
    expect(propertyMatchesLocationScope({ location: "Loma Bola", region: "Córdoba" }, "traslasierra")).toBe(true);
  });

  it("accepts Merlo only when the record identifies San Luis", () => {
    const property = { location: "Merlo", region: "San Luis" };
    expect(propertyMatchesLocationScope(property)).toBe(true);
    expect(propertyMatchesLocationScope(property, "merlo")).toBe(true);
    expect(propertyMatchesLocationScope(property, "traslasierra")).toBe(false);
    expect(propertyMatchesLocationScope({ location: "Merlo", region: "Córdoba" })).toBe(false);
  });

  it("rejects locations outside the permitted areas", () => {
    expect(propertyMatchesLocationScope({ location: "La Cumbre", region: "Córdoba" })).toBe(false);
    expect(propertyMatchesLocationScope({ location: "Villa Sarmiento", region: "Buenos Aires" })).toBe(false);
  });
});

describe("location scope labels", () => {
  it("normalizes unknown query values to all permitted areas", () => {
    expect(normalizeLocationScope("otro-lugar")).toBe("all");
    expect(LOCATION_SCOPE_LABELS.all).toBe("Traslasierra y Merlo");
  });
});
