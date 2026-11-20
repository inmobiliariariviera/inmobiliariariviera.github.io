import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Profile = { id: string; email: string | null; full_name: string | null; role: string };

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function readDefaultKey(jsonValue: string | undefined): string | undefined {
  if (!jsonValue) return undefined;
  try {
    const keys = JSON.parse(jsonValue) as Record<string, string>;
    return keys.default;
  } catch {
    return undefined;
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json(405, { error: "Método no permitido." });

  const authorization = request.headers.get("Authorization") ?? "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) return json(401, { error: "Iniciá sesión con una cuenta autorizada." });

  let body: { target_user_id?: unknown; pin?: unknown };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "El contenido de la solicitud no es válido." });
  }
  const targetUserId = typeof body.target_user_id === "string" ? body.target_user_id.trim() : "";
  const pin = typeof body.pin === "string" ? body.pin : "";
  if (!UUID_RE.test(targetUserId) || !pin || pin.length > 128) {
    return json(400, { error: "La cuenta o la clave de confirmación no son válidas." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = readDefaultKey(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")) ?? Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return json(500, { error: "Falta configuración segura de Supabase para administrar cuentas." });
  }

  const actorClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${bearer}` } },
  });
  const { data: authResult, error: authError } = await actorClient.auth.getUser(bearer);
  if (authError || !authResult.user) return json(401, { error: "La sesión no es válida o venció." });
  const actorId = authResult.user.id;

  const { data: actorData, error: actorError } = await actorClient
    .from("profiles")
    .select("id,email,full_name,role")
    .eq("id", actorId)
    .maybeSingle();
  if (actorError || !actorData || !["owner", "admin"].includes(actorData.role)) {
    return json(403, { error: "Sólo el Dueño o un Administrador puede eliminar cuentas del equipo." });
  }
  const actor = actorData as Profile;

  if (targetUserId === actorId) return json(400, { error: "No podés eliminar tu propia cuenta." });

  // Validate the confirmation key here too; the browser dialog alone is not authorization.
  const { data: pinIsValid, error: pinError } = await actorClient.rpc("verify_profit_pin", { p_pin: pin });
  if (pinError || pinIsValid !== true) return json(403, { error: "Clave incorrecta o acceso temporalmente bloqueado." });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: targetData, error: targetError } = await adminClient
    .from("profiles")
    .select("id,email,full_name,role")
    .eq("id", targetUserId)
    .maybeSingle();
  if (targetError) {
    console.error("delete-team-member: target profile lookup failed", { code: targetError.code, message: targetError.message });
    return json(500, { error: "No se pudo verificar el perfil de esa cuenta. No se eliminó nada; actualizá los datos y volvé a intentar." });
  }
  if (!targetData) {
    return json(404, { error: "El perfil ya no aparece en el equipo. Actualicé el listado; seleccioná nuevamente la cuenta. No se eliminó nada." });
  }
  const target = targetData as Profile;

  // Never remove an owner. An administrator cannot remove another administrator.
  if (target.role === "owner") return json(403, { error: "La cuenta del Dueño está protegida y no se puede eliminar desde el panel." });
  if (actor.role === "admin" && target.role === "admin") {
    return json(403, { error: "Sólo el Dueño puede eliminar una cuenta Administrador." });
  }

  // Auth deletion cascades only the profile. Operational foreign keys use SET NULL,
  // so the records remain while account assignments are cleared. Audit snapshots persist.
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId, false);
  if (deleteError) return json(400, { error: `No se pudo eliminar la cuenta: ${deleteError.message}` });

  // The profile-delete trigger snapshots the deleted profile. Attribute that audit row
  // to the actual operator while retaining the deleted profile in old_values.
  const { data: auditEvent, error: auditLookupError } = await adminClient
    .from("audit_logs")
    .select("id")
    .eq("entity_table", "profiles")
    .eq("entity_id", targetUserId)
    .eq("action", "DELETE")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let auditWarning = false;
  if (auditLookupError || !auditEvent) {
    auditWarning = true;
  } else {
    const { error: auditUpdateError } = await adminClient.from("audit_logs")
      .update({ actor_id: actor.id, actor_name: actor.full_name, actor_email: actor.email ?? authResult.user.email ?? null })
      .eq("id", auditEvent.id);
    if (auditUpdateError) auditWarning = true;
  }

  return json(200, {
    ok: true,
    deleted_user_id: targetUserId,
    deleted_name: target.full_name,
    deleted_email: target.email,
    audit_warning: auditWarning,
  });
});
