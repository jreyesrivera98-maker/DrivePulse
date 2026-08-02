import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

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

  useEffect(() => {
    refetch();

    const channel = supabase
      .channel("inspections-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "inspections" }, () => refetch())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const createInspection = useCallback(async (payload) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("inspections").insert({ ...payload, inspector_id: user.id });
    if (error) throw error;
  }, []);

  return { inspections, loading, refetch, createInspection };
}
