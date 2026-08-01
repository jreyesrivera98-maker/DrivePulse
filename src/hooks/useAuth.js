import { useEffect, useState, useCallback } from "react";
import { supabase, onAuthChange, getCurrentProfile } from "../lib/supabaseClient";

/**
 * Fuente única de verdad de sesión + perfil (rol) en toda la app.
 *
 * loading = true mientras Supabase todavía no resuelve si hay sesión
 * (incluye el caso de un enlace de invitación/recuperación recién
 * abierto) — úsalo para mostrar el loader inicial y así NUNCA
 * redirigir prematuramente a /login mientras eso se resuelve.
 *
 * passwordRecovery = true cuando el usuario llegó por un enlace de
 * invitación o "olvidé mi contraseña". Mientras sea true, la app debe
 * mostrar /set-password sin importar qué ruta esté en la URL.
 */
export function useAuth() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const reloadProfile = useCallback(async () => {
    try {
      const p = await getCurrentProfile();
      setProfile(p);
      return p;
    } catch {
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;

    // 1) Resolver el estado inicial (sesión existente, si la hay).
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) await reloadProfile();
      setLoading(false);
    });

    // 2) Escuchar cambios posteriores: login, logout, y el evento
    //    especial PASSWORD_RECOVERY que dispara Supabase cuando la
    //    URL trae el token de un enlace de invitación/recuperación.
    const unsubscribe = onAuthChange(async (event, newSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setSession(newSession);
        setPasswordRecovery(true);
        setLoading(false);
        return;
      }

      setSession(newSession);
      if (newSession) {
        await reloadProfile();
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [reloadProfile]);

  const completePasswordRecovery = useCallback(() => {
    setPasswordRecovery(false);
  }, []);

  return {
    session,
    profile,
    loading,
    passwordRecovery,
    completePasswordRecovery,
    reloadProfile,
    isAdmin: profile?.role === "administrador",
  };
}
