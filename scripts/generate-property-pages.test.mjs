import assert from "node:assert/strict";
import test from "node:test";
import { assertPublicPropertyCatalog, renderPropertyPage, renderSitemap } from "./generate-property-pages.mjs";

const baseHtml = `<!doctype html><html><head><title>Portal</title><meta name="description" content="Base" /><meta name="robots" content="index,follow" /><meta property="og:type" content="website" /><meta property="og:title" content="Portada RIVIERA" /><meta property="og:description" content="Descripción de portada." /><meta property="og:url" content="https://inmobiliariariviera.github.io/" /><meta property="og:site_name" content="RIVIERA Inmobiliaria" /><meta property="og:image" content="https://inmobiliariariviera.github.io/riviera-brand-mark.png" /><meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="Portada RIVIERA" /><meta name="twitter:description" content="Descripción de portada." /><meta name="twitter:image" content="https://inmobiliariariviera.github.io/riviera-brand-mark.png" /><link rel="canonical" href="https://inmobiliariariviera.github.io/" /></head><body><div id="root"></div></body></html>`;

const property = {
  slug: "casa-en-traslasierra",
  title: "Casa & patio en Traslasierra",
  operation: "Venta",
  category: "Casa",
  location: "Loma Bola",
  region: "Traslasierra, Córdoba",
  price: 125000,
  currency: "USD",
  price_frequency: null,
  surface: 1200,
  surface_unit: "m²",
  description: "Casa luminosa cerca del valle.",
  images: ["https://project.supabase.co/storage/v1/object/sign/property-images/photo.webp?token=private-token"],
  status: "published",
  updated_at: "2026-11-21T12:00:00.000Z",
};

test("renders public property metadata and useful initial HTML without exposing signed image URLs", () => {
  const html = renderPropertyPage(baseHtml, property, "https://inmobiliariariviera.github.io/");
  assert.match(html, /<title>Casa &amp; patio en Traslasierra \| RIVIERA Inmobiliaria<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/inmobiliariariviera\.github\.io\/propiedad\/casa-en-traslasierra\/">/);
  assert.equal((html.match(/<link rel="canonical"/g) ?? []).length, 1);
  assert.equal((html.match(/<meta property="og:url"/g) ?? []).length, 1);
  assert.equal((html.match(/<meta property="og:title"/g) ?? []).length, 1);
  assert.equal((html.match(/<meta name="twitter:title"/g) ?? []).length, 1);
  assert.match(html, /<meta property="og:url" content="https:\/\/inmobiliariariviera\.github\.io\/propiedad\/casa-en-traslasierra\/">/);
  assert.doesNotMatch(html, /<link rel="canonical" href="https:\/\/inmobiliariariviera\.github\.io\/"/);
  assert.doesNotMatch(html, /<meta property="og:url" content="https:\/\/inmobiliariariviera\.github\.io\/"/);
  assert.doesNotMatch(html, /content="Portada RIVIERA"/);
  assert.match(html, /Casa luminosa cerca del valle/);
  assert.match(html, /<h1>Casa &amp; patio en Traslasierra<\/h1>/);
  assert.match(html, /riviera-brand-mark\.png/);
  assert.doesNotMatch(html, /private-token/);
  assert.doesNotMatch(html, /property-images/);
  assert.match(html, /<meta name="robots" content="index,follow">/);
});

test("uses the stable brand image for external presigned URLs and query-bearing images", () => {
  const signedImage = "https://images.example.com/casa.webp?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=600&X-Amz-Signature=private-signature";
  const html = renderPropertyPage(baseHtml, { ...property, images: [signedImage] });
  assert.match(html, /content="https:\/\/inmobiliariariviera\.github\.io\/riviera-brand-mark\.png"/);
  assert.doesNotMatch(html, /private-signature|X-Amz-Signature/);
});

test("sitemap contains the canonical homepage and only public active property routes", () => {
  const xml = renderSitemap([
    property,
    { ...property, slug: "casa-vendida", status: "sold" },
    { ...property, slug: "casa-alquilada", status: "rented" },
    { ...property, slug: "borrador-privado", status: "draft" },
  ], "https://inmobiliariariviera.github.io/");
  assert.match(xml, /<loc>https:\/\/inmobiliariariviera\.github\.io\/<\/loc>/);
  assert.match(xml, /\/propiedad\/casa-en-traslasierra\//);
  assert.match(xml, /\/propiedad\/casa-vendida\//);
  assert.match(xml, /\/propiedad\/casa-alquilada\//);
  assert.doesNotMatch(xml, /borrador-privado/);
});

test("public deployment rejects missing Supabase configuration but local builds may omit catalog pages", () => {
  assert.throws(() => assertPublicPropertyCatalog(null, true), /VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY/);
  assert.doesNotThrow(() => assertPublicPropertyCatalog(null, false));
  assert.doesNotThrow(() => assertPublicPropertyCatalog([], true));
});
