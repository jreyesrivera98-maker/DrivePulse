import { useState, useEffect, useCallback, useRef } from "react";
import { Download, Eye, ShieldCheck, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "../../lib/supabaseClient";
import AuditViewerModal from "./AuditViewerModal";

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function HistoricoBitacoras({ vehicles, toast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterVehicle, setFilterVehicle] = useState("");
  const [viewing, setViewing] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bitacoras")
      .select("*, profiles!bitacoras_user_id_fkey(name), vehicles(plate, brand, model)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!error) setRows(data);
    setLoading(false);
  }, []);

  const channelName = useRef(`historico-bitacoras-${Math.random().toString(36).slice(2)}`).current;

  useEffect(() => {
    load();
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "bitacoras" }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [load, channelName]);

  const filtered = filterVehicle ? rows.filter((r) => r.vehicle_id === filterVehicle) : rows;

  const exportar = () => {
    const data = filtered.map((b) => ({
      Fecha: fmtDateTime(b.created_at),
      Vehiculo: `${b.vehicles?.brand || ""} ${b.vehicles?.model || ""}`,
      Placa: b.vehicles?.plate,
      Colaborador: b.profiles?.name,
      Proyecto: b.proyecto,
      Destino: b.destino,
      KM_Inicial: b.km_inicial,
      KM_Final: b.km_final,
      Combustible_Salida: b.combustible_salida,
      Combustible_Regreso: b.combustible_regreso,
      Incidencias: b.incidencias,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bitacoras");
    XLSX.writeFile(wb, "Historico_Bitacoras_DrivePulse.xlsx");
    toast("Histórico de bitácoras exportado.");
  };

  const openAudit = async (row) => {
    setLoadingAudit(true);
    const { data, error } = await supabase.from("auditoria_logs").select("*").eq("bitacora_id", row.id).single();
    setLoadingAudit(false);
    if (error) {
      toast("No se encontró el registro de auditoría para esta bitácora.", "error");
      return;
    }
    setViewing({ audit: data, row });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <ShieldCheck size={15} className="text-teal-600" /> Histórico de Bitácoras · Caja Negra
        </h3>
        <button onClick={exportar} className="flex items-center gap-1.5 text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50">
          <Download size={14} /> Exportar a Excel
        </button>
      </div>

      <select className="w-56 text-xs rounded-lg border border-slate-200 px-3 py-2 mb-4" value={filterVehicle} onChange={(e) => setFilterVehicle(e.target.value)}>
        <option value="">Todos los vehículos</option>
        {vehicles.map((v) => (
          <option key={v.id} value={v.id}>{v.plate}</option>
        ))}
      </select>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-8 justify-center">
          <Loader2 size={16} className="animate-spin" /> Cargando…
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-400">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Fecha</th>
                <th className="text-left px-3 py-2 font-semibold">Vehículo</th>
                <th className="text-left px-3 py-2 font-semibold">Colaborador</th>
                <th className="text-left px-3 py-2 font-semibold">Proyecto</th>
                <th className="text-left px-3 py-2 font-semibold">KM Recorridos</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                  <td className="px-3 py-2.5 text-slate-500">{fmtDateTime(b.created_at)}</td>
                  <td className="px-3 py-2.5 font-medium text-slate-700">{b.vehicles?.plate}</td>
                  <td className="px-3 py-2.5 text-slate-600">{b.profiles?.name}</td>
                  <td className="px-3 py-2.5 text-slate-600">{b.proyecto}</td>
                  <td className="px-3 py-2.5 text-slate-600">{b.km_final ? b.km_final - b.km_inicial : "—"}</td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => openAudit(b)} disabled={loadingAudit} className="text-teal-600 text-[11px] font-semibold hover:underline flex items-center gap-1 ml-auto">
                      <Eye size={12} /> Ver Caja Negra
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center text-slate-400 py-8 text-sm">Sin registros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <AuditViewerModal
        open={!!viewing}
        onClose={() => setViewing(null)}
        record={viewing?.audit}
        vehicle={viewing?.row?.vehicles}
        userName={viewing?.row?.profiles?.name}
      />
    </div>
  );
}
