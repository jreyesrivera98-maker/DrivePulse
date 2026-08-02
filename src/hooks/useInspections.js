import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useUniqueChannelName } from "../lib/realtimeChannel";

/**
 * Inspecciones mensuales. RLS ("admin CRUD completo inspecciones",
 * definida desde 0001_init.sql) ya restringe todo a administrador —
 * no hace falta ninguna migración nueva para este módulo.
 */
export function useInspections() {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from("inspections")
      .select("*, profiles(name)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error) setInspections(data);
    setLoading(false);
  }, []);

  const channelName = useUniqueChannelName("inspections-realtime");

  useEffect(() => {
    refetch();

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "inspections" }, () => refetch())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, channelName]);

  const createInspection = useCallback(async (payload) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("inspections").insert({ ...payload, inspector_id: user.id });
    if (error) throw error;
  }, []);

  return { inspections, loading, refetch, createInspection };
}
