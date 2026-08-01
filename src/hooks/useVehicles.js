import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export const STATUS_META = {
  disponible: { label: "Disponible", dot: "#22c55e", bg: "#dcfce7", text: "#166534" },
  en_uso: { label: "En Uso", dot: "#3b82f6", bg: "#dbeafe", text: "#1e40af" },
  reservado: { label: "Reservado", dot: "#eab308", bg: "#fef9c3", text: "#854d0e" },
  mantenimiento: { label: "Mantenimiento", dot: "#ef4444", bg: "#fee2e2", text: "#991b1b" },
};

/**
 * Trae los vehículos reales de Supabase y se mantiene sincronizado en
 * vivo: si el admin cambia el estatus de una unidad (o entra otra
 * bitácora que la ponga "en_uso") desde otra sesión, esta lista se
 * actualiza sola sin recargar la página.
 */
export function useVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    const { data, error } = await supabase.from("vehicles").select("*").order("plate");
    if (error) {
      setError(error.message);
    } else {
      setVehicles(data);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();

    const channel = supabase
      .channel("vehicles-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicles" }, () => refetch())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return { vehicles, loading, error, refetch };
}
