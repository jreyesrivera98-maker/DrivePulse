// supabase/functions/set-user-password/index.ts
//
// Permite al administrador asignar una contraseña directamente a un
// colaborador, SIN depender del envío de correo (útil mientras el
// límite de 2 correos/hora del servicio de prueba de Supabase siga
// activo, o simplemente como respaldo si alguien no recibe su
// invitación a tiempo).
//
// Seguridad: igual que invite-user, valida con el JWT de quien llama
// que sea administrador ANTES de tocar la service_role key.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido. Usa POST." }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Falta el encabezado Authorization." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser();
    if (userError || !user) return json({ error: "Sesión inválida o expirada." }, 401);

    const { data: callerProfile, error: profileError } = await callerClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || callerProfile?.role !== "administrador") {
      return json({ error: "Solo un administrador puede asignar contraseñas." }, 403);
    }

    const body = await req.json().catch(() => null);
    const { targetUserId, newPassword } = body ?? {};

    if (!targetUserId || !newPassword) {
      return json({ error: "Falta targetUserId o newPassword." }, 400);
    }
    if (newPassword.length < 8) {
      return json({ error: "La contraseña debe tener al menos 8 caracteres." }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUserId, {
      password: newPassword,
      email_confirm: true,
    });
    if (updateError) return json({ error: updateError.message }, 400);

    // Marca el perfil como activo — sin esto, la app seguiría
    // mandando a la persona a "crear contraseña" aunque ya tenga una.
    const { error: statusError } = await adminClient
      .from("profiles")
      .update({ status: "activo" })
      .eq("id", targetUserId);
    if (statusError) return json({ error: statusError.message }, 500);

    return json({ success: true }, 200);
  } catch (err) {
    console.error("set-user-password error:", err);
    return json({ error: err instanceof Error ? err.message : "Error inesperado." }, 500);
  }
});
