import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useUniqueChannelName } from "../lib/realtimeChannel";
import { addDays, todayISO } from "../lib/dateUtils";

/**
 * Ventana de datos que se mantiene cargada en memoria: suficiente
 * para navegar varias semanas hacia atrás/adelante en el calendario
 * sin tener que refetchear en cada click de "siguiente semana".
 * Los cambios en vivo (de cualquier usuario) llegan por Realtime.
 */
const WINDOW_BEFORE_DAYS = 30;
const WINDOW_AFTER_DAYS = 90;

export function useReservations() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    const from = addDays(todayISO(), -WINDOW_BEFORE_DAYS);
    const to = addDays(todayISO(), WINDOW_AFTER_DAYS);

    const { data, error } = await supabase
      .from("reservations")
      // profiles(name) hace el join para mostrar el nombre del
      // colaborador sin una segunda consulta.
      .select("*, profiles(name)")
      .gte("end_date", from)
      .lte("start_date", to)
      .order("start_date");

    if (error) {
      setError(error.message);
    } else {
      setReservations(data);
      setError(null);
    }
    setLoading(false);
  }, []);

  const channelName = useUniqueChannelName("reservations-realtime");

  useEffect(() => {
    refetch();

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, () => refetch())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, channelName]);

  /** true si [start, end] se empalma con alguna reserva existente de ese vehículo. */
  const hasOverlap = useCallback(
    (vehicleId, start, end, excludeId) =>
      reservations.some(
        (r) =>
          r.vehicle_id === vehicleId &&
          r.id !== excludeId &&
          !(end < r.start_date || start > r.end_date)
      ),
    [reservations]
  );

  const createReservation = useCallback(
    async (payload) => {
      if (hasOverlap(payload.vehicle_id, payload.start_date, payload.end_date)) {
        throw new Error("No se puede crear la reserva: existe un empalme de horario con otra reserva de este vehículo.");
      }
      const { error } = await supabase.from("reservations").insert(payload);
      if (error) throw error;
      // Realtime puede no estar activo en el proyecto: se refresca siempre.
      await refetch();
    },
    [hasOverlap, refetch]
  );

  /** Reprograma (drag & drop): valida anti-empalme antes de escribir. */
  const moveReservation = useCallback(
    async (reservationId, { vehicleId, start, end }) => {
      if (hasOverlap(vehicleId, start, end, reservationId)) {
        throw new Error("No se puede mover la reserva: existe un empalme de horario");
      }
      const { data, error } = await supabase
        .from("reservations")
        .update({ vehicle_id: vehicleId, start_date: start, end_date: end })
        .eq("id", reservationId)
        .select("id");
      if (error) throw error;
      // RLS que no deja actualizar no devuelve error, solo 0 filas.
      if (!data || data.length === 0) throw new Error("No tienes permiso para mover esta reserva.");
      await refetch();
    },
    [hasOverlap, refetch]
  );

  /** Edición completa (solo admin, lo impone RLS): valida anti-empalme excluyendo la propia reserva. */
  const updateReservation = useCallback(
    async (id, payload) => {
      if (hasOverlap(payload.vehicle_id, payload.start_date, payload.end_date, id)) {
        throw new Error("No se puede guardar: existe un empalme de horario con otra reserva de este vehículo.");
      }
      const { data, error } = await supabase.from("reservations").update(payload).eq("id", id).select("id");
      if (error) throw error;
      // RLS que no deja actualizar no devuelve error, solo 0 filas.
      if (!data || data.length === 0) throw new Error("No tienes permiso para editar esta reserva.");
      await refetch();
    },
    [hasOverlap, refetch]
  );

  /** Eliminación definitiva (solo admin, lo impone RLS). */
  const deleteReservation = useCallback(
    async (id) => {
      const { data, error } = await supabase.from("reservations").delete().eq("id", id).select("id");
      if (error) throw error;
      // Igual que en update: RLS (o una reserva ya borrada por otro admin) = 0 filas, sin error.
      if (!data || data.length === 0) throw new Error("No se pudo eliminar: no tienes permiso o la reserva ya no existe.");
      await refetch();
    },
    [refetch]
  );

  return { reservations, loading, error, refetch, createReservation, moveReservation, updateReservation, deleteReservation, hasOverlap };
}
