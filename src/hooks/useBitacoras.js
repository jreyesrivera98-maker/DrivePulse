import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useUniqueChannelName } from "../lib/realtimeChannel";

/**
 * Trae bitácoras reales. Por ahora solo lectura (el registro completo
 * de check-in/out con declaración jurada, biometría y auditoría ciega vive
 * en routes/Bitacora.jsx + hooks/useSignOff.js). Suficiente para KPIs del Dashboard.
 *
 * Cada fila incluye `caja_negra_salida` / `caja_negra_regreso` (JSONB), ver
 * lib/cajaNegra.js para su estructura.
 */
export function useBitacoras() {
  const [bitacoras, setBitacoras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from("bitacoras")
      .select("*, profiles!bitacoras_user_id_fkey(name)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setError(error.message);
    } else {
      setBitacoras(data);
      setError(null);
    }
    setLoading(false);
  }, []);

  const channelName = useUniqueChannelName("bitacoras-realtime");

  useEffect(() => {
    refetch();

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "bitacoras" }, () => refetch())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, channelName]);

  return { bitacoras, loading, error, refetch };
}

/* ============================================================
   ESCRITURA — payloads hacia Supabase (RPC)
   Ya no se envía ninguna imagen de firma (Base64 ni URL): la
   evidencia del cierre viaja en `cajaNegra` (JSONB) con
   declaracion_jurada, metodo_firma y coordenadas_entrega.
============================================================ */

/**
 * Check-out: abre un viaje.
 * @param {Object} p
 * @param {string} p.vehicleId
 * @param {string} p.proyecto
 * @param {string} p.destino
 * @param {string} p.autorizadoPor
 * @param {number} p.kmInicial
 * @param {string} p.combustibleSalida
 * @param {boolean} p.limpieza
 * @param {string} p.incidencias
 * @param {string[]} p.incidenciaFotos
 * @param {Array} p.danios
 * @param {import("../lib/cajaNegra").CajaNegra} p.cajaNegra
 * @param {Object | null} p.voucher
 * @returns {Promise<{ bitacora_id: string, hash: string }>}
 */
export async function submitCheckOut(p) {
  const { data, error } = await supabase.rpc("submit_bitacora", {
    p_vehicle_id: p.vehicleId,
    p_tipo: "salida",
    p_proyecto: p.proyecto,
    p_destino: p.destino,
    p_autorizado_por: p.autorizadoPor,
    p_km_inicial: p.kmInicial,
    p_km_final: null,
    p_combustible_salida: p.combustibleSalida,
    p_combustible_regreso: null,
    p_limpieza: p.limpieza,
    p_incidencias: p.incidencias,
    p_incidencia_fotos: p.incidenciaFotos,
    p_danios: p.danios,
    p_caja_negra: p.cajaNegra,
    p_voucher: p.voucher,
    p_user_agent: navigator.userAgent,
  });
  if (error) throw error;
  return data;
}

/**
 * Check-in: cierra el viaje abierto.
 * @param {Object} p
 * @param {string} p.bitacoraId
 * @param {number} p.kmFinal
 * @param {string} p.combustibleRegreso
 * @param {string} p.incidenciasRegreso
 * @param {string[]} p.incidenciaFotos
 * @param {Array} p.danios
 * @param {import("../lib/cajaNegra").CajaNegra} p.cajaNegra
 * @param {Object | null} p.voucher
 * @returns {Promise<{ bitacora_id: string, hash: string }>}
 */
export async function submitCheckIn(p) {
  const { data, error } = await supabase.rpc("close_bitacora", {
    p_bitacora_id: p.bitacoraId,
    p_km_final: p.kmFinal,
    p_combustible_regreso: p.combustibleRegreso,
    p_incidencias_regreso: p.incidenciasRegreso,
    p_danios: p.danios,
    p_caja_negra: p.cajaNegra,
    p_voucher: p.voucher,
    p_user_agent: navigator.userAgent,
    p_incidencia_fotos: p.incidenciaFotos,
  });
  if (error) throw error;
  return data;
}
