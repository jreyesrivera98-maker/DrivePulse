import { useState } from "react";
import { Download, Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { useVehicles } from "../hooks/useVehicles";
import { useMaintenance } from "../hooks/useMaintenance";
import { useToasts, ToastStack } from "../components/ui/Toast";
import MaintenanceModal from "../components/mantenimientos/MaintenanceModal";

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

const ESTADO_COLOR = {
  Programado: "bg-slate-100 text-slate-600",
  "En proceso": "bg-amber-50 text-amber-700",
  Completado: "bg-emerald-50 text-emerald-700",
};

export default function Mantenimientos() {
  const { vehicles, loading: loadingVehicles } = useVehicles();
  const { maintenance, loading: loadingMaintenance, createMaintenance, updateMaintenance, deleteMaintenance } = useMaintenance();
  const { toasts, toast, remove } = useToasts();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterVehicle, setFilterVehicle] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const loading = loadingVehicles || loadingMaintenance;
  const filtered = filterVehicle ? maintenance.filter((m) => m.vehicle_id === filterVehicle) : maintenance;

  const save = async (payload) => {
    if (editing) {
      await updateMaintenance(editing.id, payload);
      toast("Mantenimiento actualizado.");
    } else {
      await createMaintenance(payload);
      toast("Mantenimiento registrado.");
    }
    setEditing(null);
  };

  const remove_ = async (id) => {
    setDeletingId(id);
    try {
      await deleteMaintenance(id);
      toast("Mantenimiento eliminado.");
    } catch (err) {
      toast(err.message || "No se pudo eliminar.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const exportar = () => {
    const rows = filtered.map((m) => {
      const v = vehicles.find((x) => x.id === m.vehicle_id);
      return {
        Placa: v?.plate,
        Vehiculo: `${v?.brand || ""} ${v?.model || ""}`,
        Tipo: m.tipo,
        Taller: m.taller,
        Descripcion: m.descripcion,
        Costo: m.costo,
        Estado: m.estado,
        Fecha: m.fecha,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mantenimientos");
    XLSX.writeFile(wb, "Historico_Mantenimientos_DrivePulse.xlsx");
    toast("Reporte de mantenimientos exportado.");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24 text-slate-400 gap-2">
        <Loader2 size={18} className="animate-spin" /> Cargando mantenimientos…
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-5">
      <ToastStack toasts={toasts} remove={remove} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Mantenimientos</h1>
          <p className="text-sm text-slate-500">Histórico global y programación de servicio.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportar} className="flex items-center gap-1.5 text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50">
            <Download size={14} /> Exportar a Excel
          </button>
          <button onClick={() => { setEditing(null); setModalOpen(true); }} className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg px-3 py-2">
            <Plus size={14} /> Nuevo
          </button>
        </div>
      </div>

      <select className="w-56 text-xs rounded-lg border border-slate-200 px-3 py-2" value={filterVehicle} onChange={(e) => setFilterVehicle(e.target.value)}>
        <option value="">Todos los vehículos</option>
        {vehicles.map((v) => (
          <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>
        ))}
      </select>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase text-slate-400">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Vehículo</th>
              <th className="text-left px-4 py-3 font-semibold">Tipo</th>
              <th className="text-left px-4 py-3 font-semibold">Taller</th>
              <th className="text-left px-4 py-3 font-semibold">Costo</th>
              <th className="text-left px-4 py-3 font-semibold">Estado</th>
              <th className="text-left px-4 py-3 font-semibold">Fecha</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const v = vehicles.find((x) => x.id === m.vehicle_id);
              return (
                <tr key={m.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-700">{v?.brand} {v?.model}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{v?.plate}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{m.tipo}</td>
                  <td className="px-4 py-3 text-slate-600">{m.taller}</td>
                  <td className="px-4 py-3 text-slate-600 font-semibold">${Number(m.costo).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${ESTADO_COLOR[m.estado] || "bg-slate-100 text-slate-600"}`}>{m.estado}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(m.fecha)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => { setEditing(m); setModalOpen(true); }} className="text-slate-400 hover:text-teal-600 mr-2">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => remove_(m.id)} disabled={deletingId === m.id} className="text-slate-400 hover:text-rose-600">
                      {deletingId === m.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center text-slate-400 py-8 text-sm">Sin registros.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <MaintenanceModal open={modalOpen} onClose={() => setModalOpen(false)} vehicles={vehicles} onSave={save} editing={editing} />
    </div>
  );
}
