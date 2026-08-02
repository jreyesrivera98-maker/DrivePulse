import { useMemo } from "react";
import { Car, CheckCircle2, Activity, Wrench, DollarSign, ClipboardList, TrendingUp, Loader2 } from "lucide-react";
import { useVehicles, STATUS_META } from "../hooks/useVehicles";
import { useBitacoras } from "../hooks/useBitacoras";
import { useMaintenance } from "../hooks/useMaintenance";
import { fmtDate } from "../lib/dateUtils";

export default function Dashboard() {
  const { vehicles, loading: loadingVehicles, error: vehiclesError } = useVehicles();
  const { bitacoras, loading: loadingBitacoras, error: bitacorasError } = useBitacoras();
  const { maintenance, loading: loadingMaintenance, error: maintenanceError } = useMaintenance();

  const loading = loadingVehicles || loadingBitacoras || loadingMaintenance;
  const loadError = vehiclesError || bitacorasError || maintenanceError;

  const statusCounts = useMemo(() => {
    const c = { disponible: 0, en_uso: 0, reservado: 0, mantenimiento: 0 };
    vehicles.forEach((v) => {
      if (c[v.status] !== undefined) c[v.status]++;
    });
    return c;
  }, [vehicles]);

  const { totalKm, costPerKm } = useMemo(() => {
    const km = bitacoras.reduce((s, b) => s + Math.max(0, (b.km_final || 0) - (b.km_inicial || 0)), 0);
    const maintCost = maintenance.reduce((s, m) => s + (Number(m.costo) || 0), 0);
    // Nota: el costo de combustible real llega de fuel_vouchers (se conecta
    // con el módulo Bitácora). Mientras tanto se usa un estimado por
    // bitácora, igual que en el prototipo, solo para no dejar el KPI en $0.
    const estimatedFuelCost = bitacoras.length * 850;
    const totalCost = maintCost + estimatedFuelCost;
    return {
      totalKm: km,
      costPerKm: km > 0 ? (totalCost / km).toFixed(2) : "0.00",
    };
  }, [bitacoras, maintenance]);

  const kpis = [
    { label: "Vehículos totales", value: vehicles.length, icon: Car, color: "bg-slate-100 text-slate-700" },
    { label: "Disponibles", value: statusCounts.disponible, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600" },
    { label: "En uso", value: statusCounts.en_uso, icon: Activity, color: "bg-blue-50 text-blue-600" },
    { label: "En mantenimiento", value: statusCounts.mantenimiento, icon: Wrench, color: "bg-rose-50 text-rose-600" },
    { label: "Costo por KM", value: `$${costPerKm}`, icon: DollarSign, color: "bg-amber-50 text-amber-600" },
    { label: "Bitácoras registradas", value: bitacoras.length, icon: ClipboardList, color: "bg-teal-50 text-teal-600" },
  ];

  const maxCount = Math.max(1, ...Object.values(statusCounts));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24 text-slate-400 gap-2">
        <Loader2 size={18} className="animate-spin" /> Cargando panel general…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-lg mx-auto mt-16 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl p-4">
        Ocurrió un error al cargar los datos: {loadError}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Panel General</h1>
        <p className="text-sm text-slate-500">Resumen operativo de la flotilla en tiempo real.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${k.color}`}>
              <k.icon size={16} />
            </div>
            <p className="text-xl font-bold text-slate-900">{k.value}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-4">Distribución de estatus de flotilla</h3>
          {vehicles.length === 0 ? (
            <p className="text-sm text-slate-400">Aún no hay vehículos registrados.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(statusCounts).map(([k, v]) => (
                <div key={k} className="flex items-center gap-3">
                  <span className="w-28 text-xs text-slate-500 shrink-0">{STATUS_META[k].label}</span>
                  <div className="flex-1 h-6 rounded-lg bg-slate-50 overflow-hidden">
                    <div
                      className="h-full rounded-lg flex items-center justify-end px-2"
                      style={{ width: `${(v / maxCount) * 100}%`, background: STATUS_META[k].dot }}
                    >
                      <span className="text-[11px] font-bold text-white">{v}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-teal-600" /> Últimos mantenimientos
          </h3>
          <div className="space-y-3">
            {maintenance.slice(0, 4).map((m) => {
              const v = vehicles.find((x) => x.id === m.vehicle_id);
              return (
                <div key={m.id} className="flex items-center justify-between text-xs border-b border-slate-50 pb-2 last:border-0">
                  <div>
                    <p className="font-medium text-slate-700">
                      {v?.plate || "—"} · {m.tipo}
                    </p>
                    <p className="text-slate-400">{fmtDate(m.fecha)}</p>
                  </div>
                  <span className="font-semibold text-slate-600">${Number(m.costo).toLocaleString()}</span>
                </div>
              );
            })}
            {maintenance.length === 0 && <p className="text-xs text-slate-400">Sin registros de mantenimiento aún.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
