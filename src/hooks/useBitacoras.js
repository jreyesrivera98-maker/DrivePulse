import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useUniqueChannelName } from "../lib/realtimeChannel";

/**
 * Trae bitácoras reales. Por ahora solo lectura (el registro completo
 * de check-in/out con firma, GPS y caja negra se conecta en la
 * migración del módulo Bitácora). Suficiente para KPIs del Dashboard.
 */
export function useBitacoras() {
  const [bitacoras, setBitacoras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from("bitacoras")
      .select("*")
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
