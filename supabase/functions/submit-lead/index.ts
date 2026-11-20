import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.0";
import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";

const MAX_BODY_BYTES = 12_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function clientIp(request: Request): string | null {
  const value = request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return value && value.length <= 128 ? value : null;
}

async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function env(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}

Deno.serve(async (request) => {
  const cors = getCorsHeaders(request);
  if (!cors) return jsonResponse({ error: "Origen no autorizado." }, 403, {});
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return jsonResponse({ error: "Método no permitido." }, 405, cors);

  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return jsonResponse({ error: "La consulta excede el tamaño permitido." }, 413, cors);
    }
    const body = JSON.parse(rawBody);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const propertyId = typeof body.property_id === "string" ? body.property_id.trim() : "";
    const turnstileToken = typeof body.turnstile_token === "string" ? body.turnstile_token.trim() : "";

    if (name.length < 2 || name.length > 120 || message.length < 3 || message.length > 4000
      || email.length > 320 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      || phone.length > 80 || !UUID_RE.test(propertyId) || !turnstileToken) {
      return jsonResponse({ error: "Revisá los datos e intentá nuevamente." }, 400, cors);
    }

    const ip = clientIp(request);
    if (!ip) return jsonResponse({ error: "No se pudo validar el origen. Intentá más tarde." }, 503, cors);

    const supabaseUrl = env("SUPABASE_URL");
    const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
    const rateKey = await hmacHex(env("IP_HASH_SECRET"), ip);
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const hostnameAllowlist = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
      .split(",")
      .map((value) => {
        try { return new URL(value.trim()).hostname; } catch { return ""; }
      })
      .filter(Boolean);
    const captchaSecret = env("TURNSTILE_SECRET_KEY");
    const verificationBody = new URLSearchParams({ secret: captchaSecret, response: turnstileToken, remoteip: ip });
    const verificationResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: verificationBody,
    });
    if (!verificationResponse.ok) return jsonResponse({ error: "No se pudo validar el desafío." }, 503, cors);
    const verification = await verificationResponse.json();
    if (verification.success !== true || verification.action !== "lead-inquiry"
      || !hostnameAllowlist.includes(verification.hostname)) {
      return jsonResponse({ error: "No se pudo validar el desafío. Intentá nuevamente." }, 403, cors);
    }

    const { data: property, error: propertyError } = await admin
      .from("properties")
      .select("id")
      .eq("id", propertyId)
      .in("status", ["published", "sold", "rented"])
      .maybeSingle();
    if (propertyError || !property) return jsonResponse({ error: "La propiedad ya no está disponible." }, 400, cors);

    const { data: allowed, error: limitError } = await admin.rpc("consume_lead_submission_limit", {
      p_key: rateKey,
      p_limit: 5,
      p_window_seconds: 900,
    });
    if (limitError) {
      console.error("Lead rate-limit check failed");
      return jsonResponse({ error: "El envío no está disponible temporalmente." }, 503, cors);
    }
    if (allowed !== true) return jsonResponse({ error: "Alcanzaste el límite de consultas. Probá más tarde." }, 429, cors);

    const { data: lead, error: insertError } = await admin.from("leads").insert({
      name,
      email: email || null,
      phone: phone || null,
      message,
      property_id: propertyId,
      source: "website",
      stage: "new",
      assigned_to: null,
      created_by: null,
    }).select("id").single();
    if (insertError) {
      console.error("Lead insertion failed");
      return jsonResponse({ error: "No se pudo registrar la consulta. Probá nuevamente." }, 500, cors);
    }
    const automationRows = [];
    if (email) automationRows.push({ lead_id: lead.id, channel: "email", template_key: "welcome_inquiry", status: "queued" });
    if (phone) automationRows.push({ lead_id: lead.id, channel: "whatsapp", template_key: "welcome_inquiry", status: "queued" });
    if (automationRows.length) {
      const { error: automationError } = await admin.from("welcome_automations").upsert(automationRows, { onConflict: "lead_id,channel,template_key", ignoreDuplicates: true });
      if (automationError) console.error("Welcome automation queue failed");
    }
    const { error: eventError } = await admin.from("lead_events").insert({ lead_id: lead.id, event_type: "welcome_queued", note: "Consulta recibida desde la web; bienvenida preparada para el canal disponible." });
    if (eventError) console.error("Lead event creation failed");
    return jsonResponse({ success: true }, 200, cors);
  } catch (error) {
    console.error("Public lead function failed", error instanceof Error ? error.message : "Unknown error");
    return jsonResponse({ error: "El servicio no está configurado o no está disponible." }, 503, cors);
  }
});
