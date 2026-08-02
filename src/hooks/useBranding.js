import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export const DEFAULT_BRANDING = {
  id: 1,
  name: "DrivePulse",
  logo_url: null,
  login_title: "Bienvenido a DrivePulse",
  login_banner_url: null,
  footer_text: "© Energía Secing — DrivePulse. Uso interno exclusivo del personal autorizado.",
  lightning_action: "a",
};

/**
 * Lee la fila única de branding_settings. Devuelve los valores por
 * defecto mientras carga o si la tabla aún no existe/está vacía, para
 * que el login nunca se vea roto por falta de configuración.
 */
export function useBranding() {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data, error } = await supabase.from("branding_settings").select("*").eq("id", 1).single();
    if (!error && data) setBranding(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  /** Solo administrador puede escribir (RLS lo refuerza igual del lado servidor). */
  const updateBranding = useCallback(async (payload) => {
    const { data, error } = await supabase.from("branding_settings").update(payload).eq("id", 1).select().single();
    if (error) throw error;
    setBranding(data);
    return data;
  }, []);

  return { branding, loading, refetch, updateBranding };
}
