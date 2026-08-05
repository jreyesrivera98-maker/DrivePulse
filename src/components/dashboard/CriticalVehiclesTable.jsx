import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertOctagon } from "lucide-react";
import Badge from "../ui/Badge";
import { fmtDate } from "../../lib/dateUtils";

export default function CriticalVehiclesTable({ vehicles, maintenance, vouchers }) {
  const navigate = useNavigate();

  const rows = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    return vehicles
      .map((v) => {
        const vMaint = maintenance.filter((m) => m.vehicle_id === v.id);
        const vVouchers = vouchers.filter((x) => x.vehicle_id === v.id);
        const lastMaint = vMaint[0];
        const lastVoucher = vVouchers[0];
        const overdue = vMaint.filter((m) => m.estado !== "Completado" && m.fecha && m.fecha < today).length;
        const missingDocs = ["doc_circulacion", "doc_seguro", "doc_verificacion", "doc_licencia_asociada"].filter((k) => !v[k]).length;
        const accumulatedCost =
          vMaint.reduce((s, m) => s + (Number(m.costo) || 0), 0) + vVouchers.reduce((s, x) => s + (Number(x.monto) || 0), 0);

        const score = missingDocs * 2 + (v.status === "mantenimiento" ? 3 : 0) + overdue * 2;

        return { vehicle: v, lastMaint, lastVoucher, overdue, missingDocs, accumulatedCost, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [vehicles, maintenance, vouchers]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
        <AlertOctagon size={15} className="text-rose-500" /> Vehículos críticos
      </h3>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400 py-6 text-center">Ningún vehículo requiere atención inmediata.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-100">
              <tr>
                <th className="text-left py-2 font-semibold">Vehículo</th>
                <th className="text-left py-2 font-semibold">Estado</th>
                <th className="text-left py-2 font-semibold">Último mantenimiento</th>
                <th className="text-left py-2 font-semibold">Último combustible</th>
                <th className="text-left py-2 font-semibold">Costo acumulado</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.vehicle.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium text-slate-700">{r.vehicle.identifier || r.vehicle.plate}</td>
                  <td className="py-2.5"><Badge status={r.vehicle.status} size="sm" /></td>
                  <td className="py-2.5 text-slate-500">{r.lastMaint ? fmtDate(r.lastMaint.fecha) : "—"}</td>
                  <td className="py-2.5 text-slate-500">{r.lastVoucher ? fmtDate(r.lastVoucher.created_at?.slice(0, 10)) : "—"}</td>
                  <td className="py-2.5 font-semibold text-slate-700">${r.accumulatedCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className="py-2.5 text-right">
                    <button onClick={() => navigate("/mantenimientos")} className="text-teal-600 font-semibold hover:underline">
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
