import { useMemo, useState, useEffect } from "react";
import { Car, CheckCircle2, Activity, Wrench, DollarSign, ClipboardList, Loader2, Calendar, Fuel } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useVehicles, STATUS_META } from "../hooks/useVehicles";
import { useBitacoras } from "../hooks/useBitacoras";
import { useMaintenance } from "../hooks/useMaintenance";
import { useFuelVouchers } from "../hooks/useFuelVouchers";
import { useSelectedVehicle } from "../contexts/SelectedVehicleContext";
import { supabase } from "../lib/supabaseClient";
import { fmtDate, todayISO } from "../lib/dateUtils";
import VehicleBanner from "../components/reservas/VehicleBanner";

const STATUS_COLORS = { disponible: "#22c55e", en_uso: "#3b82f6", reservado: "#eab308", mantenimiento: "#ef4444" };

export default function Dashboard() {
  const { vehicles, loading: loadingVehicles, error: vehiclesError } = useVehicles();
  const { bitacoras, loading: loadingBitacoras, error: bitacorasError } = useBitacoras();
  const { maintenance, loading: loadingMaintenance, error: maintenanceError } = useMaintenance();
  const { vouchers } = useFuelVouchers();
  const { selectedVehicleId } = useSelectedVehicle();

  const [activeReservation, setActiveReservation] = useState(null);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];

  useEffect(() => {
    if (!selectedVehicle) return;
    let active = true;
    const today = todayISO();
    supabase
      .from("reservations")
      .select("*, profiles(name)")
      .eq("vehicle_id", selectedVehicle.id)
      .lte("start_date", today)
      .gte("end_date", today)
      .limit(1)
      .then(({ data }) => {
        if (active) setActiveReservation(data?.[0] || null);
      });
    return () => {
      active = false;
    };
  }, [selectedVehicle]);

  const loading = loadingVehicles || loadingBitacoras || loadingMaintenance;
  const loadError = vehiclesError || bitacorasError || maintenanceError;

  const statusCounts = useMemo(() => {
    const c = { disponible: 0, en_uso: 0, reservado: 0, mantenimiento: 0 };
    vehicles.forEach((v) => {
      if (c[v.status] !== undefined) c[v.status]++;
    });
    return c;
  }, [vehicles]);

  const { costPerKm } = useMemo(() => {
    const km = bitacoras.reduce((s, b) => s + Math.max(0, (b.km_final || 0) - (b.km_inicial || 0)), 0);
    const maintCost = maintenance.reduce((s, m) => s + (Number(m.costo) || 0), 0);
    const fuelCost = vouchers.reduce((s, v) => s + (Number(v.monto) || 0), 0);
    const totalCost = maintCost + fuelCost;
    return { costPerKm: km > 0 ? (totalCost / km).toFixed(2) : "0.00" };
  }, [bitacoras, maintenance, vouchers]);

  const kpis = [
    { label: "Vehículos totales", value: vehicles.length, icon: Car, color: "bg-slate-100 text-slate-700" },
    { label: "Disponibles", value: statusCounts.disponible, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600" },
    { label: "En uso", value: statusCounts.en_uso, icon: Activity, color: "bg-blue-50 text-blue-600" },
    { label: "En mantenimiento", value: statusCounts.mantenimiento, icon: Wrench, color: "bg-rose-50 text-rose-600" },
    { label: "Costo por KM", value: `$${costPerKm}`, icon: DollarSign, color: "bg-amber-50 text-amber-600" },
    { label: "Bitácoras registradas", value: bitacoras.length, icon: ClipboardList, color: "bg-teal-50 text-teal-600" },
  ];

  const pieData = Object.entries(statusCounts)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: STATUS_META[k].label, value: v, color: STATUS_COLORS[k] }));

  const categoryData = useMemo(() => {
    const cats = {};
    vehicles.forEach((v) => {
      const c = v.category || "Otros";
      cats[c] = cats[c] || { category: c, vehiculos: 0 };
      cats[c].vehiculos++;
    });
    return Object.values(cats);
  }, [vehicles]);

  const vehicleFuelKpis = useMemo(() => {
    if (!selectedVehicle) return null;
    const vv = vouchers.filter((v) => v.vehicle_id === selectedVehicle.id);
    const litros = vv.reduce((s, v) => s + (Number(v.litros) || 0), 0);
    const monto = vv.reduce((s, v) => s + (Number(v.monto) || 0), 0);
    const vehicleKm = bitacoras
      .filter((b) => b.vehicle_id === selectedVehicle.id)
      .reduce((s, b) => s + Math.max(0, (b.km_final || 0) - (b.km_inicial || 0)), 0);
    const rendimiento = litros > 0 ? (vehicleKm / litros).toFixed(1) : "—";
    return { litros, monto, rendimiento };
  }, [vouchers, bitacoras, selectedVehicle]);

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

      {selectedVehicle && (
        <div className="space-y-4">
          <VehicleBanner vehicle={selectedVehicle} />

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-600 mb-3 flex items-center gap-1.5"><Calendar size={14} className="text-teal-600" /> Reserva activa</p>
              {activeReservation ? (
                <div className="text-xs text-slate-600 space-y-1">
                  <p>Colaborador: <strong className="text-slate-800">{activeReservation.profiles?.name || "—"}</strong></p>
                  <p>Destino: <strong className="text-slate-800">{activeReservation.destino || "—"}</strong></p>
                  <p>Del {fmtDate(activeReservation.start_date)} al {fmtDate(activeReservation.end_date)}</p>
                  <p>Autorizó: {activeReservation.autorizado_por || "—"}</p>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Sin reserva activa para esta unidad.</p>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-600 mb-3 flex items-center gap-1.5"><Fuel size={14} className="text-teal-600" /> Combustible de la unidad</p>
              {vehicleFuelKpis && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-sm font-bold text-slate-800">${vehicleFuelKpis.monto.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    <p className="text-[10px] text-slate-400">Costo total</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{vehicleFuelKpis.litros.toLocaleString(undefined, { maximumFractionDigits: 1 })} L</p>
                    <p className="text-[10px] text-slate-400">Litros</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{vehicleFuelKpis.rendimiento}</p>
                    <p className="text-[10px] text-slate-400">km/L</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-4">Distribución de estatus de flotilla</h3>
          {pieData.length === 0 ? (
            <p className="text-sm text-slate-400">Aún no hay vehículos registrados.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-4">Vehículos por categoría</h3>
          {categoryData.length === 0 ? (
            <p className="text-sm text-slate-400">Sin datos.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryData}>
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="vehiculos" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 text-sm mb-4">Últimos mantenimientos</h3>
        <div className="space-y-3">
          {maintenance.slice(0, 5).map((m) => {
            const v = vehicles.find((x) => x.id === m.vehicle_id);
            return (
              <div key={m.id} className="flex items-center justify-between text-xs border-b border-slate-50 pb-2 last:border-0">
                <div>
                  <p className="font-medium text-slate-700">{v?.identifier || v?.plate} · {m.tipo}</p>
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
  );
}
