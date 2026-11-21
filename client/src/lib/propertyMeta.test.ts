import { describe, expect, it } from "vitest";
import { properties } from "@/data/properties";
import { BRAND_IMAGE_URL, propertyMetaImage } from "@/lib/propertyMeta";

describe("propertyMetaImage", () => {
  const property = properties[0];

  it("reemplaza las URLs firmadas de proveedores externos por la imagen estable de marca", () => {
    const signedUrl = "https://cdn.example.com/photo.webp?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Expires=300&X-Goog-Signature=secret";
    expect(propertyMetaImage({ ...property, images: [signedUrl] })).toBe(BRAND_IMAGE_URL);
  });

  it("usa la imagen de marca si la URL tiene parámetros incluso cuando parecen inocuos", () => {
    expect(propertyMetaImage({ ...property, images: ["https://cdn.example.com/photo.webp?format=webp"] })).toBe(BRAND_IMAGE_URL);
  });

  it("conserva una imagen HTTPS estable sin parámetros", () => {
    const stableUrl = "https://cdn.example.com/photo.webp";
    expect(propertyMetaImage({ ...property, images: [stableUrl] })).toBe(stableUrl);
  });
});
