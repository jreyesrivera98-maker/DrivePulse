import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Datos del responsable del aviso de privacidad (por organización).
 * Se leen con el RPC público `public_legal_info` (también funciona sin
 * sesión, para el login/registro) y se guardan con `save_legal_settings`
 * (solo administradores; ver migración 0024).
 *
 * @typedef {Object} LegalInfo
 * @property {string | null} responsable
 * @property {string | null} domicilio
 * @property {string | null} correoPrivacidad
 * @property {string | null} plazoConservacion
 * @property {string | null} updatedAt
 */

/** @type {LegalInfo} */
export const EMPTY_LEGAL = { responsable: null, domicilio: null, correoPrivacidad: null, plazoConservacion: null, updatedAt: null };

export const LEGAL_FIELDS = ["responsable", "domicilio", "correoPrivacidad", "plazoConservacion"];

const clean = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Normaliza la respuesta del RPC (snake_case, posible null) al formato del frontend. */
export function normalizeLegal(row) {
  if (!row) return { ...EMPTY_LEGAL };
  return {
    responsable: clean(row.responsable),
    domicilio: clean(row.domicilio),
    correoPrivacidad: clean(row.correo_privacidad),
    plazoConservacion: clean(row.plazo_conservacion),
    updatedAt: row.updated_at ?? null,
  };
}

/** Cuántos de los 4 datos siguen sin configurar. */
export const countMissingLegal = (legal) => LEGAL_FIELDS.filter((f) => !legal[f]).length;

export function useLegalSettings() {
  const [legal, setLegal] = useState({ ...EMPTY_LEGAL });
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data, error } = await supabase.rpc("public_legal_info");
    // Si falla (p. ej. migración sin aplicar) el aviso sigue funcionando con texto genérico.
    if (error) console.warn("[legal] no se pudieron leer los datos del aviso:", error.message);
    setLegal(error ? { ...EMPTY_LEGAL } : normalizeLegal(data));
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  /** Solo administrador (lo impone el RPC). Lanza Error con mensaje legible. */
  const save = useCallback(async (values) => {
    const { data, error } = await supabase.rpc("save_legal_settings", {
      p_responsable: values.responsable ?? "",
      p_domicilio: values.domicilio ?? "",
      p_correo_privacidad: values.correoPrivacidad ?? "",
      p_plazo_conservacion: values.plazoConservacion ?? "",
    });
    if (error) {
      if (/PGRST202|schema cache|Could not find the function/i.test(`${error.code} ${error.message}`)) {
        throw new Error("Falta aplicar la actualización de base de datos de privacidad (migración 0024). Avisa a quien administra Supabase.");
      }
      throw new Error(error.message || "No se pudieron guardar los datos.");
    }
    const next = normalizeLegal(data);
    setLegal(next);
    return next;
  }, []);

  return { legal, loading, refetch, save };
}
