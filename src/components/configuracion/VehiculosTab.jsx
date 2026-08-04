import { useState } from "react";
import { Plus, QrCode, Edit2, Trash2, Loader2 } from "lucide-react";
import { useVehicles } from "../../hooks/useVehicles";
import VehicleModal from "./VehicleModal";
import VehicleQRModal from "./VehicleQRModal";
import Badge from "../ui/Badge";

export default function VehiculosTab({ toast }) {
  const { vehicles, loading, createVehicle, updateVehicle, deleteVehicle } = useVehicles();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [qrVehicle, setQrVehicle] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const save = async (payload) => {
    if (editing) {
      await updateVehicle(editing.id, payload);
      toast("Vehículo actualizado.");
    } else {
      await createVehicle(payload);
      toast("Vehículo registrado en la flotilla.");
    }
    setEditing(null);
  };

  const remove = async (v) => {
    if (!window.confirm(`¿Eliminar "${v.identifier || v.plate}" de la flotilla? Esta acción no se puede deshacer.`)) return;
    setDeletingId(v.id);
    try {
      await deleteVehicle(v.id);
      toast("Vehículo eliminado.");
    } catch (err) {
      toast(err.message || "No se pudo eliminar. Verifica que no tenga reservas o bitácoras asociadas.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
        <Loader2 size={18} className="animate-spin" /> Cargando flotilla…
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{vehicles.length} vehículos registrados</p>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg px-3 py-2"
        >
          <Plus size={14} /> Nuevo Vehículo
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map((v) => (
          <div key={v.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {v.photo_url && <img src={v.photo_url} alt="" className="w-full h-32 object-cover" />}
            <div className="p-4">
              <p className="font-bold text-slate-900 text-sm">{v.identifier || v.plate}</p>
              <p className="text-xs text-slate-500 mb-2">{v.brand} {v.model} · {v.plate}</p>
              <div className="flex gap-1.5 mb-3">
                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">{v.category}</span>
                <Badge status={v.status} size="sm" />
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => setQrVehicle(v)} className="flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold border border-slate-200 rounded-lg py-1.5 hover:bg-slate-50">
                  <QrCode size={12} /> QR
                </button>
                <button onClick={() => { setEditing(v); setModalOpen(true); }} className="flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold border border-slate-200 rounded-lg py-1.5 hover:bg-slate-50">
                  <Edit2 size={12} /> Editar
                </button>
                <button onClick={() => remove(v)} disabled={deletingId === v.id} className="flex items-center justify-center text-[11px] font-semibold border border-rose-200 text-rose-600 rounded-lg py-1.5 px-2.5 hover:bg-rose-50">
                  {deletingId === v.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                </button>
              </div>
            </div>
          </div>
        ))}
        {vehicles.length === 0 && (
          <p className="col-span-full text-center text-sm text-slate-400 py-10">Aún no hay vehículos registrados. Da de alta el primero.</p>
        )}
      </div>

      <VehicleModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={save} editing={editing} />
      <VehicleQRModal open={!!qrVehicle} onClose={() => setQrVehicle(null)} vehicle={qrVehicle} />
    </div>
  );
}
