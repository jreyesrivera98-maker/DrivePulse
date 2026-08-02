import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

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

  useEffect(() => {
    refetch();

    const channel = supabase
      .channel("bitacoras-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bitacoras" }, () => refetch())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return { bitacoras, loading, error, refetch };
}
