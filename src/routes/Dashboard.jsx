import { useMemo, useState, useEffect } from "react";
import { Car, Wrench, Calendar as CalendarIcon, Fuel, DollarSign } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

import { useVehicles, STATUS_META } from "../hooks/useVehicles";
import { useBitacoras } from "../hooks/useBitacoras";
import { useMaintenance } from "../hooks/useMaintenance";
import { useFuelVouchers } from "../hooks/useFuelVouchers";
import { useReservations } from "../hooks/useReservations";
import { useInspections } from "../hooks/useInspections";
import { useFleetAlerts } from "../hooks/useFleetAlerts";
import { useSelectedVehicle } from "../contexts/SelectedVehicleContext";
import { useBranding } from "../hooks/useBranding";
import { supabase } from "../lib/supabaseClient";
import { fmtDate, todayISO, addDays } from "../lib/dateUtils";

import VehicleBanner from "../components/reservas/VehicleBanner";
import Skeleton from "../components/ui/Skeleton";
import KpiCard from "../components/dashboard/KpiCard";
import DashboardAlertsCard from "../components/dashboard/DashboardAlertsCard";
import ActivityFeed from "../components/dashboard/ActivityFeed";
import CostsPanel from "../components/dashboard/CostsPanel";
import UpcomingEvents from "../components/dashboard/UpcomingEvents";
import CriticalVehiclesTable from "../components/dashboard/CriticalVehiclesTable";
import QuickActions from "../components/dashboard/QuickActions";

const STATUS_COLORS = { disponible: "#22c55e", en_uso: "#3b82f6", reservado: "#eab308", mantenimiento: "#ef4444" };

/** Suma `valueField` de `records` agrupado por día, para los últimos `days` días. */
function bucketByDay(records, dateField, valueField, days = 14) {
  const buckets = {};
  for (let i = days - 1; i >= 0; i--) buckets[addDays(todayISO(), -i)] = 0;
  records.forEach((r) => {
    const raw = r[dateField];
    if (!raw) return;
    const day = raw.slice(0, 10);
    if (day in buckets) buckets[day] += Number(valueField ? r[valueField] : 1) || 0;
  });
  return Object.values(buckets);
}

function isThisMonth(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}
function isLastMonth(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return d.getMonth() === last.getMonth() && d.getFullYear() === last.getFullYear();
}
function pctDelta(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default function Dashboard({ profile }) {
  const { vehicles, loading: loadingVehicles, error: vehiclesError } = useVehicles();
  const { bitacoras, loading: loadingBitacoras, error: bitacorasError } = useBitacoras();
  const { maintenance, loading: loadingMaintenance, error: maintenanceError } = useMaintenance();
  const { vouchers, loading: loadingVouchers } = useFuelVouchers();
  const { reservations, loading: loadingReservations } = useReservations();
  const { inspections, loading: loadingInspections } = useInspections();
  const { branding } = useBranding();
  const { selectedVehicleId } = useSelectedVehicle();

  const alerts = useFleetAlerts({ vehicles, reservations, maintenance });

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

  const loading = loadingVehicles || loadingBitacoras || loadingMaintenance || loadingVouchers || loadingReservations || loadingInspections;
  const loadError = vehiclesError || bitacorasError || maintenanceError;

  const statusCounts = useMemo(() => {
    const c = { disponible: 0, en_uso: 0, reservado: 0, mantenimiento: 0 };
    vehicles.forEach((v) => {
      if (c[v.status] !== undefined) c[v.status]++;
    });
    return c;
  }, [vehicles]);

  const reservasHoy = useMemo(() => {
    const today = todayISO();
    return reservations.filter((r) => r.start_date <= today && r.end_date >= today).length;
  }, [reservations]);

  const monthlyKpis = useMemo(() => {
    const fuelThisMonth = vouchers.filter((v) => isThisMonth(v.created_at));
    const fuelLastMonth = vouchers.filter((v) => isLastMonth(v.created_at));
    const litrosMes = fuelThisMonth.reduce((s, v) => s + (Number(v.litros) || 0), 0);
    const litrosMesAnterior = fuelLastMonth.reduce((s, v) => s + (Number(v.litros) || 0), 0);

    const maintThisMonth = maintenance.filter((m) => isThisMonth(m.fecha));
    const maintLastMonth = maintenance.filter((m) => isLastMonth(m.fecha));
    const costoOperativoMes = maintThisMonth.reduce((s, m) => s + (Number(m.costo) || 0), 0) + fuelThisMonth.reduce((s, v) => s + (Number(v.monto) || 0), 0);
    const costoOperativoMesAnterior = maintLastMonth.reduce((s, m) => s + (Number(m.costo) || 0), 0) + fuelLastMonth.reduce((s, v) => s + (Number(v.monto) || 0), 0);

    return {
      litrosMes,
      deltaLitros: pctDelta(litrosMes, litrosMesAnterior),
      costoOperativoMes,
      deltaCosto: pctDelta(costoOperativoMes, costoOperativoMesAnterior),
    };
  }, [vouchers, maintenance]);

  const sparklineReservas = useMemo(() => bucketByDay(reservations, "created_at", null, 14), [reservations]);
  const sparklineLitros = useMemo(() => bucketByDay(vouchers, "created_at", "litros", 14), [vouchers]);
  const sparklineCosto = useMemo(() => {
    const maintDaily = bucketByDay(maintenance, "fecha", "costo", 14);
    const fuelDaily = bucketByDay(vouchers, "created_at", "monto", 14);
    return maintDaily.map((v, i) => v + (fuelDaily[i] || 0));
  }, [maintenance, vouchers]);

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

  if (loadError) {
    return (
      <div className="max-w-lg mx-auto mt-16 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl p-4">
        Ocurrió un error al cargar los datos: {loadError}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {greeting()}, {profile?.name?.split(" ")[0] || ""}
          </h1>
          <p className="text-sm text-slate-500">
            {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} ·{" "}
            {new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} · {branding.name}
          </p>
        </div>
      </div>

      <QuickActions />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="Vehículos activos" value={statusCounts.disponible + statusCounts.en_uso} icon={Car} color="bg-emerald-50 text-emerald-600" linkTo="/reservas" />
        <KpiCard label="En mantenimiento" value={statusCounts.mantenimiento} icon={Wrench} color="bg-rose-50 text-rose-600" linkTo="/mantenimientos" />
        <KpiCard label="Reservados" value={statusCounts.reservado} icon={CalendarIcon} color="bg-amber-50 text-amber-600" linkTo="/reservas" />
        <KpiCard label="Reservas de hoy" value={reservasHoy} icon={CalendarIcon} color="bg-blue-50 text-blue-600" trendData={sparklineReservas} linkTo="/reservas" />
        <KpiCard
          label="Combustible este mes"
          value={`${monthlyKpis.litrosMes.toLocaleString(undefined, { maximumFractionDigits: 0 })} L`}
          icon={Fuel}
          color="bg-teal-50 text-teal-600"
          trendData={sparklineLitros}
          deltaPct={monthlyKpis.deltaLitros}
          linkTo="/combustible"
        />
        <KpiCard
          label="Costo operativo mensual"
          value={`$${monthlyKpis.costoOperativoMes.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={DollarSign}
          color="bg-slate-100 text-slate-700"
          trendData={sparklineCosto}
          deltaPct={monthlyKpis.deltaCosto}
          linkTo="/mantenimientos"
        />
      </div>

      {/* Alertas + Costos */}
      <div className="grid lg:grid-cols-2 gap-5">
        <DashboardAlertsCard alerts={alerts} />
        <CostsPanel maintenance={maintenance} vouchers={vouchers} vehicleCount={vehicles.length} />
      </div>

      {/* Vehículo seleccionado */}
      {selectedVehicle && (
        <div className="space-y-4">
          <VehicleBanner vehicle={selectedVehicle} />
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-600 mb-3 flex items-center gap-1.5">
                <CalendarIcon size={14} className="text-teal-600" /> Reserva activa
              </p>
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
              <p className="text-xs font-semibold text-slate-600 mb-3 flex items-center gap-1.5">
                <Fuel size={14} className="text-teal-600" /> Combustible de la unidad
              </p>
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

      {/* Actividad reciente + Próximos eventos */}
      <div className="grid lg:grid-cols-2 gap-5">
        <ActivityFeed reservations={reservations} maintenance={maintenance} vouchers={vouchers} bitacoras={bitacoras} inspections={inspections} vehicles={vehicles} />
        <UpcomingEvents maintenance={maintenance} reservations={reservations} vehicles={vehicles} />
      </div>

      {/* Estado de flotilla */}
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

      {/* Vehículos críticos */}
      <CriticalVehiclesTable vehicles={vehicles} maintenance={maintenance} vouchers={vouchers} />
    </div>
  );
}
