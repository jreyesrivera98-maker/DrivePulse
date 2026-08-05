import { useMemo } from "react";
import { DollarSign, Fuel, Wrench, Hammer } from "lucide-react";

function isThisMonth(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export default function CostsPanel({ maintenance, vouchers, vehicleCount }) {
  const costs = useMemo(() => {
    const maintMonth = maintenance.filter((m) => isThisMonth(m.fecha));
    const preventivo = maintMonth.filter((m) => m.tipo === "Preventivo").reduce((s, m) => s + (Number(m.costo) || 0), 0);
    const correctivo = maintMonth.filter((m) => m.tipo === "Correctivo").reduce((s, m) => s + (Number(m.costo) || 0), 0);
    const combustible = vouchers.filter((v) => isThisMonth(v.created_at)).reduce((s, v) => s + (Number(v.monto) || 0), 0);
    const total = preventivo + correctivo + combustible;
    const promedio = vehicleCount > 0 ? total / vehicleCount : 0;
    return { preventivo, correctivo, combustible, total, promedio };
  }, [maintenance, vouchers, vehicleCount]);

  const rows = [
    { label: "Combustible", value: costs.combustible, icon: Fuel, color: "text-teal-600 bg-teal-50" },
    { label: "Mantenimiento preventivo", value: costs.preventivo, icon: Wrench, color: "text-blue-600 bg-blue-50" },
    { label: "Reparaciones (correctivo)", value: costs.correctivo, icon: Hammer, color: "text-amber-600 bg-amber-50" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
        <DollarSign size={15} className="text-teal-600" /> Costos del mes
      </h3>
      <div className="space-y-3 mb-4">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${r.color}`}>
                <r.icon size={13} />
              </div>
              <span className="text-xs text-slate-600">{r.label}</span>
            </div>
            <span className="text-xs font-semibold text-slate-800">${r.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700">Costo total mensual</span>
        <span className="text-sm font-bold text-slate-900">${costs.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[11px] text-slate-400">Promedio por vehículo</span>
        <span className="text-[11px] font-semibold text-slate-500">${costs.promedio.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
      </div>
    </div>
  );
}
