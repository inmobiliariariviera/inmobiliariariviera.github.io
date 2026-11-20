import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const allowedRoles = new Set(["owner", "admin", "manager", "secretary", "user"]);

function json(status: number, body: Record<string, unknown>) {
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = readDefaultKey(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")) ?? Deno.env.get("SUPABASE_ANON_KEY");
  const secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !publishableKey || !secretKey) return json(500, { error: "Falta configuración segura de Supabase para invitar cuentas." });

  const actorClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${bearer}` } },
  });
  const { data: userResult, error: authError } = await actorClient.auth.getUser(bearer);
  if (authError || !userResult.user) return json(401, { error: "La sesión no es válida o venció." });

  const { data: actorProfile, error: profileError } = await actorClient
    .from("profiles")
    .select("role")
    .eq("id", userResult.user.id)
    .maybeSingle();
  if (profileError || actorProfile?.role !== "owner") return json(403, { error: "Sólo el Dueño puede invitar usuarios y asignar cargos." });

  let body: { email?: unknown; full_name?: unknown; role?: unknown };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "El contenido de la solicitud no es válido." });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const role = typeof body.role === "string" ? body.role : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return json(400, { error: "Ingresá un correo válido." });
  if (fullName.length < 2 || fullName.length > 120) return json(400, { error: "Ingresá el nombre completo (2 a 120 caracteres)." });
  if (!allowedRoles.has(role)) return json(400, { error: "El cargo seleccionado no es válido." });

  const adminClient = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, must_change_password: true },
  });
  if (inviteError || !inviteData.user) {
    return json(400, { error: inviteError?.message ?? "No se pudo crear la invitación." });
  }

  const { error: roleError } = await actorClient.rpc("set_team_role", {
    target_user_id: inviteData.user.id,
    new_role: role,
  });
  if (roleError) {
    return json(500, { error: `La invitación se envió, pero no se pudo asignar el cargo. La cuenta queda sin permisos elevados: ${roleError.message}` });
  }

  return json(200, { ok: true, email, full_name: fullName, role });
});
