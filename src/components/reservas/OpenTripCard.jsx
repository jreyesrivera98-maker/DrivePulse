import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, LogIn, User, Loader2 } from "lucide-react";
import { useOpenBitacora } from "../../hooks/useOpenBitacora";
import { fmtDate } from "../../lib/dateUtils";
import AdminForceCloseModal from "./AdminForceCloseModal";

/**
 * Solo se muestra al administrador cuando el vehículo seleccionado
 * está "en_uso". Dos caminos para cerrar el viaje:
 *  1) Ir al check-in normal (/bitacora) — igual que haría el
 *     colaborador, con firma y fotos.
 *  2) Cerrarlo administrativamente aquí mismo — para cuando el
 *     check-in normal no se pudo completar por algún error.
 */
export default function OpenTripCard({ vehicle, toast }) {
  const navigate = useNavigate();
  const { openBitacora, loading, refetch } = useOpenBitacora(vehicle?.id);
  const [forceCloseOpen, setForceCloseOpen] = useState(false);

  if (vehicle?.status !== "en_uso") return null;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-2 text-xs text-slate-400">
        <Loader2 size={14} className="animate-spin" /> Verificando viaje en curso…
      </div>
    );
  }

  if (!openBitacora) return null;

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
