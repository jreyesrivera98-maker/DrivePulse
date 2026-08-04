import { useState, useMemo } from "react";
import { Plus, Download, Search, Loader2, DollarSign, Droplets, Fuel, ExternalLink } from "lucide-react";
import * as XLSX from "xlsx";
import { useVehicles } from "../hooks/useVehicles";
import { useFuelVouchers } from "../hooks/useFuelVouchers";
import { useSelectedVehicle } from "../contexts/SelectedVehicleContext";
import { useToasts, ToastStack } from "../components/ui/Toast";
import RegistrarRecargaModal from "../components/combustible/RegistrarRecargaModal";

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const CONFIDENCE_COLOR = {
  Alta: "bg-emerald-50 text-emerald-700",
  Media: "bg-amber-50 text-amber-700",
  Baja: "bg-rose-50 text-rose-700",
  Manual: "bg-slate-100 text-slate-600",
};

export default function Combustible({ profile }) {
  const { vehicles, loading: loadingVehicles } = useVehicles();
  const { vouchers, loading: loadingVouchers, registerVoucher } = useFuelVouchers();
  const { selectedVehicleId } = useSelectedVehicle();
  const { toasts, toast, remove } = useToasts();

  const [modalOpen, setModalOpen] = useState(false);
  const [q, setQ] = useState("");
  const [filterVehicle, setFilterVehicle] = useState("");

  const filtered = vouchers.filter((v) => {
    const matchesVehicle = !filterVehicle || v.vehicle_id === filterVehicle;
    const text = `${v.profiles?.name || ""} ${v.proyecto || ""} ${v.estacion || ""}`.toLowerCase();
    const matchesText = !q || text.includes(q.toLowerCase());
    return matchesVehicle && matchesText;
  });

  const globalKpis = useMemo(() => {
    const gasto = vouchers.reduce((s, v) => s + (Number(v.monto) || 0), 0);
    const litros = vouchers.reduce((s, v) => s + (Number(v.litros) || 0), 0);
    return { gasto, litros, recargas: vouchers.length };
  }, [vouchers]);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const vehicleKpis = useMemo(() => {
    if (!selectedVehicleId) return null;
    const vv = vouchers.filter((v) => v.vehicle_id === selectedVehicleId);
    const litros = vv.reduce((s, v) => s + (Number(v.litros) || 0), 0);
    const monto = vv.reduce((s, v) => s + (Number(v.monto) || 0), 0);
    return { litros, monto };
  }, [vouchers, selectedVehicleId]);

  const exportar = () => {
    const rows = filtered.map((v) => ({
      Fecha: fmtDateTime(v.created_at),
      Vehiculo: `${v.vehicles?.brand || ""} ${v.vehicles?.model || ""}`,
      Placa: v.vehicles?.plate,
      Colaborador: v.profiles?.name,
      Proyecto: v.proyecto,
      Litros: v.litros,
      Monto: v.monto,
      Estacion: v.estacion,
      Folio: v.folio,
      Confianza_OCR: v.ocr_confidence,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Combustible");
    XLSX.writeFile(wb, "Combustible_DrivePulse.xlsx");
    toast("Reporte de combustible exportado.");
  };

  const save = async (payload) => {
    await registerVoucher(payload);
    toast("Recarga registrada correctamente.");
  };

  const loading = loadingVehicles || loadingVouchers;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24 text-slate-400 gap-2">
        <Loader2 size={18} className="animate-spin" /> Cargando combustible…
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-5">
      <ToastStack toasts={toasts} remove={remove} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Combustible</h1>
          <p className="text-sm text-slate-500">Registro y seguimiento de recargas con lectura OCR de vouchers.</p>
        </div>
        <div className="flex gap-2">
          {profile?.role === "administrador" && (
            <button onClick={exportar} className="flex items-center gap-1.5 text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50">
              <Download size={14} /> Exportar a Excel
            </button>
          )}
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg px-3 py-2">
            <Plus size={14} /> Registrar Recarga
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3"><DollarSign size={16} /></div>
          <p className="text-xl font-bold text-slate-900">${globalKpis.gasto.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Gasto total</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3"><Droplets size={16} /></div>
          <p className="text-xl font-bold text-slate-900">{globalKpis.litros.toLocaleString(undefined, { maximumFractionDigits: 1 })} L</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Litros cargados</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-3"><Fuel size={16} /></div>
          <p className="text-xl font-bold text-slate-900">{globalKpis.recargas}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Recargas registradas</p>
        </div>
      </div>

      {selectedVehicle && vehicleKpis && (
        <div className="bg-teal-50/50 border border-teal-100 rounded-2xl p-4 flex flex-wrap items-center gap-6">
          <p className="text-xs font-semibold text-teal-700">{selectedVehicle.identifier || selectedVehicle.plate} — {selectedVehicle.brand} {selectedVehicle.model}</p>
          <p className="text-xs text-slate-600">Litros totales: <strong>{vehicleKpis.litros.toLocaleString(undefined, { maximumFractionDigits: 1 })} L</strong></p>
          <p className="text-xs text-slate-600">Gasto total: <strong>${vehicleKpis.monto.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></p>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por colaborador, proyecto, estación..." className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-2 text-xs" />
        </div>
        <select className="text-xs rounded-lg border border-slate-200 px-3 py-2" value={filterVehicle} onChange={(e) => setFilterVehicle(e.target.value)}>
          <option value="">Todos los vehículos</option>
          {vehicles.map((v) => <option key={v.id} value={v.id}>{v.identifier || v.plate}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase text-slate-400">
            <tr>
              <th className="text-left px-3 py-2 font-semibold">Fecha</th>
              <th className="text-left px-3 py-2 font-semibold">Vehículo</th>
              <th className="text-left px-3 py-2 font-semibold">Colaborador</th>
              <th className="text-left px-3 py-2 font-semibold">Litros</th>
              <th className="text-left px-3 py-2 font-semibold">Monto</th>
              <th className="text-left px-3 py-2 font-semibold">Estación</th>
              <th className="text-left px-3 py-2 font-semibold">Confianza</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <tr key={v.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                <td className="px-3 py-2.5 text-slate-500">{fmtDateTime(v.created_at)}</td>
                <td className="px-3 py-2.5 font-medium text-slate-700">{v.vehicles?.plate || "—"}</td>
                <td className="px-3 py-2.5 text-slate-600">{v.profiles?.name}</td>
                <td className="px-3 py-2.5 text-slate-600">{v.litros}</td>
                <td className="px-3 py-2.5 text-slate-600 font-semibold">${Number(v.monto).toLocaleString()}</td>
                <td className="px-3 py-2.5 text-slate-600">{v.estacion || "—"}</td>
                <td className="px-3 py-2.5">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CONFIDENCE_COLOR[v.ocr_confidence] || CONFIDENCE_COLOR.Manual}`}>{v.ocr_confidence}</span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  {v.imagen_url && (
                    <a href={v.imagen_url} target="_blank" rel="noreferrer" className="text-teal-600 text-[11px] font-semibold hover:underline flex items-center gap-1 justify-end">
                      Ver ticket <ExternalLink size={11} />
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center text-slate-400 py-8 text-sm">Sin registros.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <RegistrarRecargaModal open={modalOpen} onClose={() => setModalOpen(false)} vehicles={vehicles} onSave={save} />
    </div>
  );
}
