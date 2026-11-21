import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(ROOT, "dist", "public");
const DEFAULT_ORIGIN = "https://inmobiliariariviera.github.io";

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function cleanText(value = "") {
  return String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function safeShareImage(images, origin) {
  const candidate = Array.isArray(images) ? images.find((image) => typeof image === "string" && /^https:\/\//i.test(image)) : null;
  if (!candidate) return new URL("/riviera-brand-mark.png", origin).href;
  try {
    const url = new URL(candidate);
    const privateOrSignedPath = /\/storage\/v1\/object\/(?:sign|authenticated)\//i.test(url.pathname);
    if (url.username || url.password || url.search || url.hash || privateOrSignedPath) {
      return new URL("/riviera-brand-mark.png", origin).href;
    }
    return url.href;
  } catch {
    return new URL("/riviera-brand-mark.png", origin).href;
  }
}

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]);
}

export function renderSitemap(properties, siteOrigin = DEFAULT_ORIGIN) {
  const origin = new URL(siteOrigin).origin;
  const urls = [new URL("/", origin).href];
  for (const property of properties) {
    if (["published", "sold", "rented"].includes(property.status) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(String(property.slug ?? ""))) {
      urls.push(new URL(`/propiedad/${encodeURIComponent(property.slug)}/`, origin).href);
    }
  }
  const uniqueUrls = [...new Set(urls)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${uniqueUrls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`).join("\n")}\n</urlset>\n`;
}

async function writeSitemap(properties, origin) {
  const xml = renderSitemap(properties, origin);
  await writeFile(path.join(OUTPUT, "sitemap.xml"), xml, "utf8");
  await writeFile(path.join(OUTPUT, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${new URL("/sitemap.xml", origin).href}\n`, "utf8");
  console.info(`Sitemap generado con ${(xml.match(/<url>/g) ?? []).length} URLs públicas.`);
}

function money(value, currency) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || !["ARS", "USD"].includes(currency)) return "Precio a consultar";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

function surfaceLabel(property) {
  const amount = Number(property.surface);
  if (!Number.isFinite(amount)) return "Superficie a consultar";
  return `${amount.toLocaleString("es-AR")} ${property.surface_unit === "ha" ? "hectáreas" : "m²"}`;
}

function metaDescription(property) {
  const summary = cleanText(property.description) || `${property.operation} de ${String(property.category).toLowerCase()} en ${property.location}, ${property.region}.`;
  const full = `${summary} ${property.operation} · ${property.location}.`;
  return full.length > 155 ? `${full.slice(0, 154).trimEnd()}…` : full;
}

function jsonForHtml(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

export function renderPropertyPage(baseHtml, property, siteOrigin = DEFAULT_ORIGIN) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(String(property.slug ?? ""))) throw new Error("Slug de propiedad no válido");
  if (!["published", "sold", "rented"].includes(property.status)) throw new Error("Sólo se prerenderizan propiedades activas");

  const origin = new URL(siteOrigin).origin;
  const url = new URL(`/propiedad/${encodeURIComponent(property.slug)}/`, origin).href;
  const title = `${cleanText(property.title)} | RIVIERA Inmobiliaria`;
  const description = metaDescription(property);
  const image = safeShareImage(property.images, origin);
  const operation = cleanText(property.operation);
  const category = cleanText(property.category);
  const location = `${cleanText(property.location)}, ${cleanText(property.region)}`;
  const listingJsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: cleanText(property.title),
    description,
    url,
    image,
    dateModified: property.updated_at || undefined,
    offers: {
      "@type": "Offer",
      price: Number(property.price),
      priceCurrency: property.currency,
      availability: property.status === "published" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      url,
    },
    provider: { "@type": "RealEstateAgent", name: "RIVIERA Inmobiliaria", url: origin },
  };
  const fallback = `<main class="share-fallback"><article><p>RIVIERA Inmobiliaria · Propiedades en Traslasierra</p><h1>${escapeHtml(cleanText(property.title))}</h1><p>${escapeHtml(operation)} · ${escapeHtml(category)} · ${escapeHtml(location)}</p><p><strong>${escapeHtml(money(property.price, property.currency))}${property.price_frequency ? ` / ${escapeHtml(property.price_frequency)}` : ""}</strong> · ${escapeHtml(surfaceLabel(property))}</p><p>${escapeHtml(cleanText(property.description))}</p><a href="../../#/propiedad/${encodeURIComponent(property.slug)}">Abrir ficha completa y consultar a RIVIERA</a></article></main>`;
  const meta = [
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(url)}">`,
    `<meta property="og:site_name" content="RIVIERA Inmobiliaria">`,
    `<meta property="og:image" content="${escapeHtml(image)}">`,
    `<meta property="og:image:alt" content="${escapeHtml(cleanText(property.title))}">`,
    `<meta name="robots" content="index,follow">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
    `<meta name="twitter:image" content="${escapeHtml(image)}">`,
    `<link rel="canonical" href="${escapeHtml(url)}">`,
    `<script type="application/ld+json">${jsonForHtml(listingJsonLd)}</script>`,
  ].join("\n    ");

  return baseHtml
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, "")
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, "")
    .replace(/<meta\s+name="robots"[^>]*>/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>/gi, "")
    .replace(/<head>/i, '<head>\n    <base href="../../">')
    .replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/>/i, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(/<\/head>/i, `    ${meta}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${fallback}</div>`);
}

export function assertPublicPropertyCatalog(properties, required) {
  if (properties === null && required) {
    throw new Error("El build público requiere VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para generar las fichas SEO y el sitemap del catálogo.");
  }
}

async function fetchPublicProperties() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl && !anonKey) return null;
  if (!supabaseUrl || !anonKey) throw new Error("Configurá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY juntas para generar páginas SEO.");

  const endpoint = new URL("/rest/v1/properties", supabaseUrl);
  endpoint.searchParams.set("select", "slug,title,operation,category,location,region,price,currency,price_frequency,surface,surface_unit,description,images,status,updated_at");
  endpoint.searchParams.set("status", "in.(published,sold,rented)");
  endpoint.searchParams.set("order", "created_at.desc");
  const response = await fetch(endpoint, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, Accept: "application/json" } });
  if (!response.ok) throw new Error(`No se pudieron leer los avisos públicos de Supabase (HTTP ${response.status}).`);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error("La respuesta pública de propiedades no tiene el formato esperado.");
  return data;
}

async function main() {
  const baseHtml = await readFile(path.join(OUTPUT, "index.html"), "utf8");
  const configuredOrigin = process.env.VITE_PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL || DEFAULT_ORIGIN;
  const origin = new URL(configuredOrigin);
  if (origin.protocol !== "https:") throw new Error("VITE_PUBLIC_SITE_URL debe ser una URL HTTPS pública.");
  const properties = await fetchPublicProperties();
  if (!properties) {
    assertPublicPropertyCatalog(properties, process.env.REQUIRE_SEO_PROPERTY_PAGES === "true");
    await writeSitemap([], origin.origin);
    console.info("Metadatos prerenderizados omitidos: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY no están configuradas.");
    return;
  }

  let generated = 0;
  for (const property of properties) {
    if (!["published", "sold", "rented"].includes(property.status)) continue;
    const html = renderPropertyPage(baseHtml, property, origin.href);
    const pageDirectory = path.join(OUTPUT, "propiedad", property.slug);
    await mkdir(pageDirectory, { recursive: true });
    await writeFile(path.join(pageDirectory, "index.html"), html, "utf8");
    generated += 1;
  }
  await writeSitemap(properties, origin.origin);
  console.info(`Páginas públicas con metadatos específicos generadas: ${generated}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "No se pudieron generar las páginas públicas.");
    process.exitCode = 1;
  });
}
