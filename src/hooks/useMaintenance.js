import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useUniqueChannelName } from "../lib/realtimeChannel";

/**
 * Mantenimientos: lectura en vivo + CRUD completo. El CRUD está
 * restringido a administrador por la policy "admin CRUD completo
 * mantenimientos" en 0001_init.sql — si un trabajador llegara a
 * llamar estas funciones, Supabase las rechaza en la base de datos,
 * no solo en el cliente.
 */
export function useMaintenance() {
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from("maintenance")
      .select("*")
      .order("fecha", { ascending: false })
      .limit(200);

    if (error) {
      setError(error.message);
    } else {
      setMaintenance(data);
      setError(null);
    }
    setLoading(false);
  }, []);

  const channelName = useUniqueChannelName("maintenance-realtime");

  useEffect(() => {
    refetch();

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "maintenance" }, () => refetch())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, channelName]);

  const createMaintenance = useCallback(async (payload) => {
    const { error } = await supabase.from("maintenance").insert(payload);
    if (error) throw error;
  }, []);

  const updateMaintenance = useCallback(async (id, payload) => {
    const { error } = await supabase.from("maintenance").update(payload).eq("id", id);
    if (error) throw error;
  }, []);

  const deleteMaintenance = useCallback(async (id) => {
    const { error } = await supabase.from("maintenance").delete().eq("id", id);
    if (error) throw error;
  }, []);

  return { maintenance, loading, error, refetch, createMaintenance, updateMaintenance, deleteMaintenance };
}
