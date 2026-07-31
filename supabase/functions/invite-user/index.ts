// supabase/functions/invite-user/index.ts
//
// Invita a un colaborador por correo (Authentication → Admin API).
// Esta operación NO se puede hacer desde el cliente con la anon key,
// por eso vive en una Edge Function con la service_role key, que
// nunca se expone al navegador.
//
// Seguridad: antes de invitar a nadie, esta función verifica con el
// JWT de quien llama que su perfil tenga role = 'administrador'.
// Si no lo es, rechaza la petición (403) — así el frontend no puede
// saltarse la regla de "solo el admin invita" ni siquiera llamando
// la función directo.
//
// Deploy:
//   supabase functions deploy invite-user
//
// Variables de entorno necesarias (ver README.md de esta carpeta):
//   SITE_URL  -> ej. https://drivepulse.vercel.app  (para el redirectTo)
// SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY ya están
// disponibles automáticamente dentro de toda Edge Function de Supabase.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Método no permitido. Usa POST." }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Falta el encabezado Authorization." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const siteUrl = Deno.env.get("SITE_URL") ?? "";

    // ------------------------------------------------------------------
    // 1) Verificar identidad y rol de quien está llamando a la función,
    //    usando SU token (no la service_role key todavía).
    // ------------------------------------------------------------------
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser();

    if (userError || !user) {
      return json({ error: "Sesión inválida o expirada." }, 401);
    }

    const { data: callerProfile, error: profileError } = await callerClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || callerProfile?.role !== "administrador") {
      return json(
        { error: "Solo un administrador puede invitar colaboradores." },
        403
      );
    }

    // ------------------------------------------------------------------
    // 2) Validar el cuerpo de la petición.
    // ------------------------------------------------------------------
    const body = await req.json().catch(() => null);
    const { name, email, role, area } = body ?? {};

    if (!name || !email || !role) {
      return json(
        { error: "Nombre, correo y rol son obligatorios." },
        400
      );
    }
    if (!["administrador", "trabajador"].includes(role)) {
      return json({ error: "Rol inválido." }, 400);
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return json({ error: "Correo electrónico inválido." }, 400);
    }

    // ------------------------------------------------------------------
    // 3) Invitar con la service_role key (único cliente con permiso
    //    de administración de usuarios).
    // ------------------------------------------------------------------
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: invited, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { name },
        redirectTo: siteUrl ? `${siteUrl}/set-password` : undefined,
      });

    if (inviteError) {
      // Caso común: el correo ya existe.
      return json({ error: inviteError.message }, 400);
    }

    // ------------------------------------------------------------------
    // 4) El trigger on_auth_user_created (ver 0001_init.sql) ya creó
    //    la fila en profiles con status = 'invitado'. Aquí completamos
    //    rol, área y nombre.
    // ------------------------------------------------------------------
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({ role, area: area ?? null, name })
      .eq("id", invited.user.id);

    if (updateError) {
      return json(
        {
          error: `El usuario se invitó, pero no se pudo completar su perfil: ${updateError.message}`,
        },
        500
      );
    }

    return json(
      { success: true, userId: invited.user.id, email: invited.user.email },
      200
    );
  } catch (err) {
    console.error("invite-user error:", err);
    return json(
      { error: err instanceof Error ? err.message : "Error inesperado." },
      500
    );
  }
});
