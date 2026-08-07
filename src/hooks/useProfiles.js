import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useUniqueChannelName } from "../lib/realtimeChannel";

export function useProfiles() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data, error } = await supabase.from("profiles").select("*").order("name");
    if (!error) setProfiles(data);
    setLoading(false);
  }, []);

  const channelName = useUniqueChannelName("profiles-realtime");

  useEffect(() => {
    refetch();

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => refetch())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, channelName]);

  /** Solo administrador puede escribir (reforzado por RLS del lado servidor). */
  const updateRole = useCallback(async (id, role) => {
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) throw error;
  }, []);

  const toggleStatus = useCallback(async (id, status) => {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) throw error;
  }, []);

  const updateName = useCallback(async (id, name) => {
    const { error } = await supabase.from("profiles").update({ name }).eq("id", id);
    if (error) throw error;
  }, []);

  return { profiles, loading, refetch, updateRole, toggleStatus, updateName };
}
