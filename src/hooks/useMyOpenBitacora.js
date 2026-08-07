import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Busca si el usuario autenticado actual tiene un viaje abierto en
 * CUALQUIER vehículo (no solo el seleccionado). Se usa para llevarlo
 * directo a su check-in pendiente si cierra la app a medio viaje y
 * vuelve más tarde — sin esto, tendría que acordarse de qué unidad
 * usó y buscarla manualmente en el selector.
 */
export function useMyOpenBitacora() {
  const [myOpenVehicleId, setMyOpenVehicleId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (active) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("bitacoras")
        .select("vehicle_id")
        .eq("user_id", user.id)
        .eq("estado", "abierta")
        .limit(1)
        .maybeSingle();
      if (active) {
        setMyOpenVehicleId(data?.vehicle_id || null);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return { myOpenVehicleId, loading };
}
