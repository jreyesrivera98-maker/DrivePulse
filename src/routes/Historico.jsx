import { useState, useEffect, useCallback } from "react";
import { Search, Download, Eye, Edit2, Trash2, X, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabaseClient";
import { useVehicles } from "../hooks/useVehicles";
import { useToasts, ToastStack } from "../components/ui/Toast";
import BitacoraDetailModal from "../components/historico/BitacoraDetailModal";
import EditBitacoraModal from "../components/historico/EditBitacoraModal";

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function Historico() {
  const { vehicles } = useVehicles();
  const { toasts, toast, remove } = useToasts();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterVehicle, setFilterVehicle] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bitacoras")
      .select("*, profiles(name), vehicles(plate, brand, model, identifier)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (!error) setRows(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`historico-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bitacoras" }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [load]);

  const filtered = rows.filter((b) => {
    if (filterVehicle && b.vehicle_id !== filterVehicle) return false;
    if (desde && b.created_at < desde) return false;
    if (hasta && b.created_at > `${hasta}T23:59:59`) return false;
    if (q) {
      const text = `${b.profiles?.name || ""} ${b.proyecto || ""} ${b.vehicles?.plate || ""} ${b.vehicles?.identifier || ""}`.toLowerCase();
      if (!text.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const limpiarFiltros = () => {
    setQ("");
    setFilterVehicle("");
    setDesde("");
    setHasta("");
  };

  const exportar = () => {
    const data = filtered.map((b) => ({
      Fecha: fmtDateTime(b.created_at),
      Vehiculo: `${b.vehicles?.brand || ""} ${b.vehicles?.model || ""}`,
      Placa: b.vehicles?.plate,
      Colaborador: b.profiles?.name,
      Proyecto: b.proyecto,
      KM_Inicial: b.km_inicial,
      KM_Final: b.km_final,
      KM_Recorrido: b.km_final ? b.km_final - b.km_inicial : "",
      Combustible_Salida: b.combustible_salida,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historico");
    XLSX.writeFile(wb, "Historico_Bitacoras_DrivePulse.xlsx");
    toast("Histórico exportado.");
  };

  const saveEdit = async (id, payload) => {
    const { error } = await supabase.from("bitacoras").update(payload).eq("id", id);
    if (error) throw error;
    toast("Bitácora actualizada.");
  };

  const remove_ = async (b) => {
    if (!window.confirm("¿Eliminar esta bitácora? El registro de auditoría original se conserva, pero este registro de trabajo se borrará.")) return;
    setDeletingId(b.id);
    try {
      const { error } = await supabase.from("bitacoras").delete().eq("id", b.id);
      if (error) throw error;
      toast("Bitácora eliminada.");
    } catch (err) {
      toast(err.message || "No se pudo eliminar.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-5">
      <ToastStack toasts={toasts} remove={remove} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Histórico de Bitácoras</h1>
          <p className="text-sm text-slate-500">Consulta, edita y exporta todos los registros de uso.</p>
        </div>
        <button onClick={exportar} className="flex items-center gap-1.5 text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50">
          <Download size={14} /> Exportar a Excel
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-2 items-end">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Colaborador, proyecto, vehículo, placas..." className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-2 text-xs" />
        </div>
        <select className="text-xs rounded-lg border border-slate-200 px-3 py-2" value={filterVehicle} onChange={(e) => setFilterVehicle(e.target.value)}>
          <option value="">Todos los vehículos</option>
          {vehicles.map((v) => <option key={v.id} value={v.id}>{v.identifier || v.plate}</option>)}
        </select>
        <div>
          <label className="block text-[10px] text-slate-400 mb-1">Desde</label>
          <input type="date" className="text-xs rounded-lg border border-slate-200 px-3 py-2" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div>
          <label className="block text-[10px] text-slate-400 mb-1">Hasta</label>
          <input type="date" className="text-xs rounded-lg border border-slate-200 px-3 py-2" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <button onClick={limpiarFiltros} className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-rose-600 px-2 py-2">
          <X size={12} /> Limpiar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-8 justify-center"><Loader2 size={16} className="animate-spin" /> Cargando…</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-400">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Fecha</th>
                <th className="text-left px-3 py-2 font-semibold">Vehículo</th>
                <th className="text-left px-3 py-2 font-semibold">Colaborador</th>
                <th className="text-left px-3 py-2 font-semibold">Proyecto</th>
                <th className="text-left px-3 py-2 font-semibold">KM</th>
                <th className="text-left px-3 py-2 font-semibold">Combustible</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                  <td className="px-3 py-2.5 text-slate-500">{fmtDateTime(b.created_at)}</td>
                  <td className="px-3 py-2.5 font-medium text-slate-700">{b.vehicles?.identifier || b.vehicles?.plate}</td>
                  <td className="px-3 py-2.5 text-slate-600">{b.profiles?.name}</td>
                  <td className="px-3 py-2.5 text-slate-600">{b.proyecto}</td>
                  <td className="px-3 py-2.5 text-slate-600">{b.km_inicial}{b.km_final ? ` → ${b.km_final}` : ""}</td>
                  <td className="px-3 py-2.5 text-slate-600">{b.combustible_salida}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <button onClick={() => setViewing(b)} className="text-teal-600 hover:text-teal-700 mr-2"><Eye size={14} className="inline" /></button>
                    <button onClick={() => setEditing(b)} className="text-slate-400 hover:text-teal-600 mr-2"><Edit2 size={14} className="inline" /></button>
                    <button onClick={() => remove_(b)} disabled={deletingId === b.id} className="text-slate-400 hover:text-rose-600">
                      {deletingId === b.id ? <Loader2 size={14} className="animate-spin inline" /> : <Trash2 size={14} className="inline" />}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 py-8 text-sm">Sin registros.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <BitacoraDetailModal open={!!viewing} onClose={() => setViewing(null)} bitacora={viewing} />
      <EditBitacoraModal open={!!editing} onClose={() => setEditing(null)} bitacora={editing} onSave={saveEdit} />
    </div>
  );
}
