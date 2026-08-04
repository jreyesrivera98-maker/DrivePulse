import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useUniqueChannelName } from "../lib/realtimeChannel";

/**
 * Recargas de combustible. RLS (0006_combustible_historico_auditoria):
 * admin ve todas, cada trabajador ve solo las que registró él mismo
 * (columna user_id, ya no depende de una bitácora asociada).
 */
export function useFuelVouchers() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const channelName = useUniqueChannelName("fuel-vouchers-realtime");

  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from("fuel_vouchers")
      .select("*, vehicles(plate, brand, model), profiles(name)")
      .order("created_at", { ascending: false })
      .limit(300);
    if (!error) setVouchers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "fuel_vouchers" }, () => refetch())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [refetch, channelName]);

  /** Captura de recarga independiente (fuera de un check-in/out). */
  const registerVoucher = useCallback(async (payload) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("fuel_vouchers").insert({ ...payload, user_id: user.id });
    if (error) throw error;
  }, []);

  return { vouchers, loading, refetch, registerVoucher };
}
