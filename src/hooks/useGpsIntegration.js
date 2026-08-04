import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

const DEFAULTS = { id: 1, enabled: false, portal_url: "https://gps.4track.mx/", username: "", password: "" };

export function useGpsIntegration() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data, error } = await supabase.from("gps_integration_settings").select("*").eq("id", 1).single();
    if (!error && data) setSettings(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const updateSettings = useCallback(async (payload) => {
    const { data, error } = await supabase.from("gps_integration_settings").update(payload).eq("id", 1).select().single();
    if (error) throw error;
    setSettings(data);
    return data;
  }, []);

  return { settings, loading, refetch, updateSettings };
}
