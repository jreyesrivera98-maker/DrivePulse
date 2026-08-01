import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export function useProfiles() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data, error } = await supabase.from("profiles").select("*").order("name");
    if (!error) setProfiles(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { profiles, loading, refetch };
}
