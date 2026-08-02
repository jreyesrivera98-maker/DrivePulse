import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, MapPin } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { todayISO } from "../lib/dateUtils";
import Badge from "../components/ui/Badge";
import VehicleQRCode from "../components/vehiculo/VehicleQRCode";

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default function VehiculoLanding() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState(null);
  const [activeReservation, setActiveReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      const { data: v, error: vErr } = await supabase.from("vehicles").select("*").eq("id", id).single();

      if (!active) return;
      if (vErr || !v) {
        setError("Vehículo no encontrado.");
        setLoading(false);
        return;
      }
      setVehicle(v);

      const today = todayISO();
      const { data: reservas } = await supabase
        .from("reservations")
        .select("*, profiles(name)")
        .eq("vehicle_id", id)
        .lte("start_date", today)
        .gte("end_date", today)
        .limit(1);

      if (!active) return;
      setActiveReservation(reservas?.[0] || null);
      setError(null);
      setLoading(false);
    };

    load();

    // Vivo: si el estatus del vehículo cambia mientras alguien tiene
    // la landing abierta (por ejemplo, otro colaborador hace check-in),
    // se refleja sin recargar.
    const channel = supabase
      .channel(`vehiculo-landing-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicles", filter: `id=eq.${id}` }, load)
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24 text-slate-400 gap-2">
        <Loader2 size={18} className="animate-spin" /> Cargando…
      </div>
    );
  }

  if (error || !vehicle) {
    return <div className="p-10 text-center text-slate-400">{error || "Vehículo no encontrado."}</div>;
  }

  return (
    <div className="max-w-md mx-auto py-10 px-4 space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {vehicle.photo_url && <img src={vehicle.photo_url} className="w-full h-44 object-cover" alt="" />}
        <div className="p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-slate-900">{vehicle.brand} {vehicle.model}</h2>
            <Badge status={vehicle.status} />
          </div>
          <p className="text-sm font-mono text-slate-500 mb-4">{vehicle.plate}</p>

          {vehicle.status === "disponible" && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <p className="text-sm font-semibold text-emerald-700 mb-3">🟢 Unidad libre y disponible</p>
              <button
                onClick={() => navigate("/bitacora", { state: { vehicleId: vehicle.id } })}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2.5 text-sm font-bold"
              >
                Iniciar Viaje / Check-out
              </button>
            </div>
          )}

          {vehicle.status === "en_uso" && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-blue-700 mb-2">🔵 En uso actualmente</p>
              <p className="text-xs text-blue-600">Colaborador: <strong>{activeReservation?.profiles?.name || "No disponible"}</strong></p>
              <p className="text-xs text-blue-600">
                Entrega estimada: <strong>{activeReservation ? fmtDate(activeReservation.end_date) : "—"}</strong>
              </p>
              <button
                onClick={() => navigate("/bitacora", { state: { vehicleId: vehicle.id } })}
                className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-bold"
              >
                Registrar Check-in / Regreso
              </button>
            </div>
          )}

          {vehicle.status === "mantenimiento" && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center">
              <p className="text-sm font-semibold text-rose-700 mb-1">🔴 En mantenimiento</p>
              <p className="text-xs text-rose-600">Unidad inhabilitada temporalmente por servicio de taller.</p>
            </div>
          )}

          {vehicle.status === "reservado" && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-sm font-semibold text-amber-700">🟡 Reservado</p>
              <p className="text-xs text-amber-600 mt-1">
                {activeReservation
                  ? `Reservado por ${activeReservation.profiles?.name || "un colaborador"} hasta ${fmtDate(activeReservation.end_date)}.`
                  : "Esta unidad tiene una reserva próxima."}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 bg-white rounded-2xl border border-slate-200 p-5">
        <p className="text-xs text-slate-500 flex items-center gap-1.5"><MapPin size={13} /> Coloca este código en el tablero de la unidad</p>
        <VehicleQRCode vehicleId={vehicle.id} size={160} showUrl />
      </div>
    </div>
  );
}
