import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export const DEFAULT_BRANDING = {
  name: "DrivePulse",
  logo_url: null,
  login_title: "Bienvenido a DrivePulse",
  login_banner_url: null,
  footer_text: "© DrivePulse. Uso interno exclusivo del personal autorizado.",
  lightning_action: "a",
};

/**
 * Ahora hay UNA fila de branding_settings POR organización — ya no
 * se filtra por un id fijo, la política de seguridad (RLS) solo deja
 * ver la fila de la organización del usuario autenticado.
 *
 * Limitación conocida: como esto requiere sesión, la pantalla de
 * Login todavía no puede mostrar el logo/color de cada empresa antes
 * de iniciar sesión (se ve el branding genérico de DrivePulse hasta
 * entrar) — para lograr un login 100% personalizado por empresa se
 * necesitaría resolver la organización por subdominio antes de
 * autenticar, que es un siguiente paso, no algo que esta migración
 * resuelva todavía.
 */
export function useBranding() {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data, error } = await supabase.from("branding_settings").select("*").maybeSingle();
    if (!error && data) setBranding(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  /** Solo administrador puede escribir (RLS lo refuerza igual del lado servidor). */
  const updateBranding = useCallback(async (payload) => {
    const { data, error } = await supabase.from("branding_settings").update(payload).select().single();
    if (error) throw error;
    setBranding(data);
    return data;
  }, []);

  return { branding, loading, refetch, updateBranding };
}
