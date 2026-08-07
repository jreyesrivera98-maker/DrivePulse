import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Falla rápido y con un mensaje claro en vez de un error críptico de fetch.
  throw new Error(
    "Faltan variables de entorno de Supabase. Copia .env.example a .env.local y define " +
      "VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY con los valores de tu proyecto " +
      "(Supabase Dashboard → Project Settings → API)."
  );
}

/**
 * Cliente único de Supabase para todo el frontend.
 * Usa la anon key (segura para el cliente); la service_role key
 * NUNCA debe importarse aquí — solo se usa dentro de Edge Functions.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // necesario para leer el token del enlace de invitación/recuperación
  },
});

/* ============================================================
   AUTH HELPERS
============================================================ */

/** Inicia sesión con correo y contraseña. */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/** Cierra la sesión activa. */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Envía un correo de "restablecer contraseña" a un colaborador ya
 * activo. Reutiliza el mismo evento PASSWORD_RECOVERY y la misma
 * pantalla /set-password que el flujo de invitación — no requiere
 * Edge Function ni service_role key, se puede llamar directo desde
 * el cliente con la anon key.
 */
export async function resetPasswordForEmail(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/set-password`,
  });
  if (error) throw error;
}

/**
 * Asigna una contraseña directamente a un colaborador (respaldo
 * cuando el correo no llega o el límite de envíos está agotado).
 * Solo un administrador puede llamar esto — la Edge Function lo
 * verifica de nuevo del lado del servidor.
 */
export async function setUserPassword(targetUserId, newPassword) {
  const { data, error } = await supabase.functions.invoke("set-user-password", {
    body: { targetUserId, newPassword },
  });
  if (error) throw error;
  return data;
}

/**
 * Define la contraseña del usuario invitado/en recuperación.
 * Debe llamarse solo después del evento PASSWORD_RECOVERY (ver useAuth/SetPassword).
 */
export async function setNewPassword(password) {
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw error;

  // Marca el perfil como activo una vez que ya tiene contraseña.
  // Si esto falla (ej. por una policy de RLS mal configurada), NO
  // debe fallar en silencio: sin esto, la persona queda atrapada en
  // /set-password para siempre porque la app nunca ve status='activo'.
  if (data?.user?.id) {
    const { error: profileError } = await supabase.from("profiles").update({ status: "activo" }).eq("id", data.user.id);
    if (profileError) {
      throw new Error(
        `Tu contraseña se guardó, pero no se pudo activar tu cuenta (${profileError.message}). ` +
          "Contacta a tu administrador para que verifique tu perfil."
      );
    }
  }
  return data;
}

/** Trae el perfil (rol, nombre, status) del usuario autenticado actual. */
export async function getCurrentProfile() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (error) throw error;
  return data;
}

/**
 * Suscribe un callback a los cambios de sesión de Supabase.
 * Úsalo en un hook (ej. useAuth) para:
 *  - Mostrar el loader inicial mientras se resuelve la sesión.
 *  - Detectar el evento "PASSWORD_RECOVERY" y mostrar /set-password
 *    en vez de redirigir prematuramente a /login.
 */
export function onAuthChange(callback) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return () => subscription.unsubscribe();
}

/* ============================================================
   INVITACIONES (requiere Edge Function con service_role key)
============================================================ */

/**
 * Invita a un colaborador por correo. Esto NO se puede hacer con la
 * anon key desde el cliente (requiere permisos de admin), así que
 * delega a una Edge Function ("invite-user") que sí tiene la
 * service_role key de forma segura en el servidor.
 *
 * Ver: supabase/functions/invite-user
 */
export async function inviteUser({ name, email, role, area }) {
  const { data, error } = await supabase.functions.invoke("invite-user", {
    body: { name, email, role, area },
  });
  if (error) throw error;
  return data;
}

/* ============================================================
   STORAGE HELPERS
============================================================ */

const BUCKETS = {
  vehiclePhotos: "vehicle-photos",
  evidencePhotos: "evidence-photos",
  signatures: "signatures",
  fuelVouchers: "fuel-vouchers",
  branding: "branding",
};

/** Sube un archivo (File/Blob) a un bucket y regresa su URL pública o firmada. */
export async function uploadFile(bucket, path, file, { isPublic = false } = {}) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });
  if (error) throw error;

  if (isPublic) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
  const { data, error: signError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 días
  if (signError) throw signError;
  return data.signedUrl;
}

export { BUCKETS };
