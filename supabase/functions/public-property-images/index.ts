import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.0";
import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SIGNED_URL_TTL_SECONDS = 86_400;

function decodeObjectPath(path: string): string {
  try { return decodeURIComponent(path); } catch { return path; }
}

Deno.serve(async (request) => {
  const cors = getCorsHeaders(request);
  if (!cors) return jsonResponse({ error: "Origen no autorizado." }, 403, {});
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return jsonResponse({ error: "Método no permitido." }, 405, cors);

  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 12_000) {
      return jsonResponse({ error: "Solicitud demasiado grande." }, 413, cors);
    }
    const body = JSON.parse(rawBody);
    const propertyIds = Array.isArray(body.property_ids)
      ? [...new Set(body.property_ids.filter((value: unknown): value is string => typeof value === "string" && UUID_RE.test(value)))]
      : [];
    if (propertyIds.length === 0 || propertyIds.length > 100) {
      return jsonResponse({ error: "Lista de propiedades no válida." }, 400, cors);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase service configuration");

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: properties, error } = await admin
      .from("properties")
      .select("id, images")
      .in("id", propertyIds)
      .in("status", ["published", "sold", "rented"]);
    if (error) {
      console.error("Public image lookup failed", { code: error.code, message: error.message });
      return jsonResponse({ error: "No se pudieron cargar las imágenes." }, 503, cors);
    }

    const signedImages: Record<string, string> = {};
    const normalizedByStoredPath = new Map<string, string>();
    const uniquePaths = new Set<string>();
    for (const property of properties ?? []) {
      for (const image of (property.images ?? []) as string[]) {
        if (typeof image === "string" && image.length > 0 && !/^https?:\/\//i.test(image)) {
          const normalizedPath = decodeObjectPath(image);
          normalizedByStoredPath.set(image, normalizedPath);
          uniquePaths.add(normalizedPath);
        }
      }
    }
    if (uniquePaths.size > 300) return jsonResponse({ error: "Demasiadas imágenes." }, 413, cors);

    const signedByPath: Record<string, string> = {};
    for (const path of uniquePaths) {
      const { data, error: signError } = await admin.storage
        .from("property-images")
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      if (signError) {
        console.error("Public image signing failed", { code: signError.name, message: signError.message });
      } else if (data?.signedUrl) {
        signedByPath[path] = data.signedUrl;
      } else {
        console.error("Public image signing returned no URL");
      }
    }
    for (const [storedPath, normalizedPath] of normalizedByStoredPath) {
      const signedUrl = signedByPath[normalizedPath];
      if (signedUrl) signedImages[storedPath] = signedUrl;
    }
    return jsonResponse({ images: signedImages }, 200, cors);
  } catch (error) {
    console.error("Public image signing failed", error instanceof Error ? error.message : "Unknown error");
    return jsonResponse({ error: "El servicio de imágenes no está disponible." }, 503, cors);
  }
});
