import { useState, useEffect, useCallback } from "react";
import { Search, Download, Eye, ShieldCheck, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabaseClient";
import { useVehicles } from "../hooks/useVehicles";
import { useToasts, ToastStack } from "../components/ui/Toast";
import AuditViewerModal from "../components/bitacora/AuditViewerModal";

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const TIPO_LABEL = { salida: "Salida", regreso: "Regreso" };
const TIPO_COLOR = { salida: "bg-blue-50 text-blue-700", regreso: "bg-emerald-50 text-emerald-700" };

export default function Auditoria() {
  const { vehicles } = useVehicles();
  const { toasts, toast, remove } = useToasts();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [viewing, setViewing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("auditoria_logs")
      .select("*, bitacoras(tipo, proyecto, km_inicial, km_final, vehicle_id, vehicles(plate, brand, model, identifier), profiles(name))")
      .order("created_at", { ascending: false })
      .limit(500);
    if (!error) setRows(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`auditoria-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "auditoria_logs" }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [load]);

  const filtered = rows.filter((r) => {
    const b = r.bitacoras;
    if (filterVehicle && b?.vehicle_id !== filterVehicle) return false;
    if (filterTipo && b?.tipo !== filterTipo) return false;
    if (q) {
      const text = `${b?.profiles?.name || ""} ${b?.proyecto || ""} ${b?.vehicles?.plate || ""}`.toLowerCase();
      if (!text.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const exportar = () => {
    const data = filtered.map((r) => ({
      Fecha: fmtDateTime(r.created_at),
      Tipo: TIPO_LABEL[r.bitacoras?.tipo] || "—",
      Vehiculo: r.bitacoras?.vehicles?.plate || "—",
      Colaborador: r.bitacoras?.profiles?.name || "—",
      Proyecto: r.bitacoras?.proyecto || "—",
      KM_Recorrido: r.bitacoras?.km_final ? r.bitacoras.km_final - r.bitacoras.km_inicial : "",
      Hash: r.hash,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Auditoria");
    XLSX.writeFile(wb, "Auditoria_CajaNegra_DrivePulse.xlsx");
    toast("Auditoría exportada.");
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-5">
      <ToastStack toasts={toasts} remove={remove} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2"><ShieldCheck size={20} className="text-teal-600" /> Auditoría — Caja Negra</h1>
          <p className="text-sm text-slate-500">Registros forenses inmutables. No pueden editarse ni eliminarse.</p>
        </div>
        <button onClick={exportar} className="flex items-center gap-1.5 text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50">
          <Download size={14} /> Exportar a Excel
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Colaborador, proyecto, vehículo..." className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-2 text-xs" />
        </div>
        <select className="text-xs rounded-lg border border-slate-200 px-3 py-2" value={filterVehicle} onChange={(e) => setFilterVehicle(e.target.value)}>
          <option value="">Todos los vehículos</option>
          {vehicles.map((v) => <option key={v.id} value={v.id}>{v.identifier || v.plate}</option>)}
        </select>
        <select className="text-xs rounded-lg border border-slate-200 px-3 py-2" value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)}>
          <option value="">Todos (Salidas / Regresos)</option>
          <option value="salida">Solo Salidas</option>
          <option value="regreso">Solo Regresos</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-8 justify-center"><Loader2 size={16} className="animate-spin" /> Cargando…</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-400">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Timestamp</th>
                <th className="text-left px-3 py-2 font-semibold">Tipo</th>
                <th className="text-left px-3 py-2 font-semibold">Vehículo</th>
                <th className="text-left px-3 py-2 font-semibold">Colaborador</th>
                <th className="text-left px-3 py-2 font-semibold">Proyecto</th>
                <th className="text-left px-3 py-2 font-semibold">KM</th>
                <th className="text-left px-3 py-2 font-semibold">Hash</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const b = r.bitacoras;
                return (
                  <tr key={r.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                    <td className="px-3 py-2.5 text-slate-500">{fmtDateTime(r.created_at)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TIPO_COLOR[b?.tipo] || "bg-slate-100 text-slate-500"}`}>{TIPO_LABEL[b?.tipo] || "—"}</span>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-700">{b?.vehicles?.identifier || b?.vehicles?.plate || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-600">{b?.profiles?.name || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-600">{b?.proyecto || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-600">{b?.km_final ? b.km_final - b.km_inicial : "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-400">{r.hash?.slice(0, 12)}…</td>
                    <td className="px-3 py-2.5 text-right">
                      <button onClick={() => setViewing(r)} className="text-teal-600 text-[11px] font-semibold hover:underline flex items-center gap-1 ml-auto"><Eye size={12} /> Ver</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={8} className="text-center text-slate-400 py-8 text-sm">Sin registros.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <AuditViewerModal
        open={!!viewing}
        onClose={() => setViewing(null)}
        record={viewing}
        vehicle={viewing?.bitacoras?.vehicles}
        userName={viewing?.bitacoras?.profiles?.name}
      />
    </div>
  );
}
