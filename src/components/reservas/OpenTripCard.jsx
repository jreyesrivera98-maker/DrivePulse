import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, LogIn, User, Loader2, Wrench } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useOpenBitacora } from "../../hooks/useOpenBitacora";
import { fmtDate } from "../../lib/dateUtils";
import AdminForceCloseModal from "./AdminForceCloseModal";

/**
 * Solo se muestra al administrador cuando el vehículo seleccionado
 * está "en_uso". Maneja DOS escenarios distintos:
 *
 *  A) Hay un viaje realmente abierto (bitácora con estado='abierta')
 *     → ofrece cerrarlo normal o administrativamente.
 *
 *  B) El vehículo dice "en_uso" pero NO hay ninguna bitácora abierta
 *     que lo respalde — esto pasa si alguien cambió el estatus a
 *     mano desde Configuración → Vehículos, o si se borró una
 *     bitácora abierta desde Histórico sin revertir el estatus del
 *     vehículo. Aquí no hay "viaje" que cerrar — solo hace falta
 *     corregir el dato inconsistente directamente.
 */
export default function OpenTripCard({ vehicle, toast }) {
  const navigate = useNavigate();
  const { openBitacora, loading, refetch } = useOpenBitacora(vehicle?.id);
  const [forceCloseOpen, setForceCloseOpen] = useState(false);
  const [fixing, setFixing] = useState(false);

  if (vehicle?.status !== "en_uso") return null;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-2 text-xs text-slate-400">
        <Loader2 size={14} className="animate-spin" /> Verificando viaje en curso…
      </div>
    );
  }

  // Escenario B: estatus inconsistente, sin viaje real que cerrar.
  if (!openBitacora) {
    const fixStatus = async () => {
      setFixing(true);
      try {
        const { error } = await supabase.from("vehicles").update({ status: "disponible" }).eq("id", vehicle.id);
        if (error) throw error;
        toast(`${vehicle.identifier || vehicle.plate} corregido a "Disponible".`);
      } catch (err) {
        toast(err.message || "No se pudo corregir el estatus.", "error");
      } finally {
        setFixing(false);
      }
    };

    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <p className="text-xs font-bold text-amber-800 mb-1.5 flex items-center gap-1.5">
          <Wrench size={13} /> Estatus inconsistente
        </p>
        <p className="text-xs text-amber-700 mb-3">
          Este vehículo aparece "En Uso" pero no hay ningún viaje abierto registrado en Bitácora. Puede haber
          pasado por un cambio manual de estatus o por eliminar una bitácora abierta desde Histórico.
        </p>
        <button
          onClick={fixStatus}
          disabled={fixing}
          className="flex items-center gap-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-3 py-2 disabled:opacity-60"
        >
          {fixing && <Loader2 size={13} className="animate-spin" />}
          Marcar como disponible
        </button>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
      <p className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-1.5">
        <AlertTriangle size={13} /> Este vehículo tiene un viaje abierto
      </p>
      <div className="text-xs text-blue-700 space-y-0.5 mb-3">
        <p className="flex items-center gap-1.5"><User size={12} /> {openBitacora.profiles?.name || "—"}</p>
        <p>Desde {fmtDate(openBitacora.created_at?.slice(0, 10))} · {openBitacora.destino || "—"}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => navigate("/bitacora", { state: { vehicleId: vehicle.id } })}
          className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2"
        >
          <LogIn size={13} /> Ir a cerrar (check-in normal)
        </button>
        <button
          onClick={() => setForceCloseOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold border border-amber-300 text-amber-700 hover:bg-amber-50 rounded-lg px-3 py-2"
        >
          <AlertTriangle size={13} /> Cerrar administrativamente
        </button>
      </div>

      <AdminForceCloseModal
        open={forceCloseOpen}
        onClose={() => setForceCloseOpen(false)}
        openBitacora={openBitacora}
        vehicle={vehicle}
        toast={toast}
        onClosed={refetch}
      />
    </div>
  );
}
