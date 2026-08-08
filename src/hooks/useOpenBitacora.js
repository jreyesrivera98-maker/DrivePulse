import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useUniqueChannelName } from "../lib/realtimeChannel";

/** Trae el viaje abierto (estado='abierta') de un vehículo, si existe. */
export function useOpenBitacora(vehicleId) {
  const [openBitacora, setOpenBitacora] = useState(null);
  const [loading, setLoading] = useState(true);
  const channelName = useUniqueChannelName("open-bitacora-realtime");

  const refetch = useCallback(async () => {
    if (!vehicleId) {
      setOpenBitacora(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("bitacoras")
      .select("*, profiles!bitacoras_user_id_fkey(name)")
      .eq("vehicle_id", vehicleId)
      .eq("estado", "abierta")
      .maybeSingle();
    setOpenBitacora(data || null);
    setLoading(false);
  }, [vehicleId]);

  useEffect(() => {
    refetch();
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "bitacoras" }, () => refetch())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [refetch, channelName]);

  return { openBitacora, loading, refetch };
}
