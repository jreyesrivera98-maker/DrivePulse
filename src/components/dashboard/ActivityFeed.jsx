import { useMemo } from "react";
import { Calendar, Wrench, Fuel, ClipboardList, ShieldCheck } from "lucide-react";

const TYPE_META = {
  reserva: { icon: Calendar, color: "text-blue-600 bg-blue-50" },
  mantenimiento: { icon: Wrench, color: "text-amber-600 bg-amber-50" },
  combustible: { icon: Fuel, color: "text-teal-600 bg-teal-50" },
  bitacora: { icon: ClipboardList, color: "text-slate-600 bg-slate-100" },
  inspeccion: { icon: ShieldCheck, color: "text-emerald-600 bg-emerald-50" },
};

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function ActivityFeed({ reservations, maintenance, vouchers, bitacoras, inspections, vehicles }) {
  const items = useMemo(() => {
    const findVehicle = (id) => vehicles.find((v) => v.id === id);
    const list = [];

    reservations.slice(0, 8).forEach((r) =>
      list.push({
        id: `res-${r.id}`,
        type: "reserva",
        text: `Reserva creada: ${findVehicle(r.vehicle_id)?.identifier || findVehicle(r.vehicle_id)?.plate || "—"} — ${r.destino || r.project || ""}`,
        date: r.created_at,
      })
    );
    maintenance.slice(0, 8).forEach((m) =>
      list.push({
        id: `maint-${m.id}`,
        type: "mantenimiento",
        text: `Mantenimiento ${m.tipo.toLowerCase()}: ${findVehicle(m.vehicle_id)?.identifier || findVehicle(m.vehicle_id)?.plate || "—"} — $${Number(m.costo).toLocaleString()}`,
        date: m.created_at,
      })
    );
    vouchers.slice(0, 8).forEach((v) =>
      list.push({
        id: `fuel-${v.id}`,
        type: "combustible",
        text: `Recarga: ${findVehicle(v.vehicle_id)?.identifier || findVehicle(v.vehicle_id)?.plate || "—"} — ${v.litros} L / $${v.monto}`,
        date: v.created_at,
      })
    );
    bitacoras.slice(0, 8).forEach((b) =>
      list.push({
        id: `bit-${b.id}`,
        type: "bitacora",
        text: `${b.tipo === "salida" ? "Check-out" : "Check-in"}: ${findVehicle(b.vehicle_id)?.identifier || findVehicle(b.vehicle_id)?.plate || "—"}`,
        date: b.created_at,
      })
    );
    inspections.slice(0, 8).forEach((i) =>
      list.push({
        id: `insp-${i.id}`,
        type: "inspeccion",
        text: `Inspección mensual: ${findVehicle(i.vehicle_id)?.identifier || findVehicle(i.vehicle_id)?.plate || "—"}`,
        date: i.created_at,
      })
    );

    return list.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
  }, [reservations, maintenance, vouchers, bitacoras, inspections, vehicles]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-800 text-sm mb-4">Actividad reciente</h3>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400 py-6 text-center">Todavía no hay actividad registrada.</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {items.map((it) => {
            const meta = TYPE_META[it.type];
            return (
              <div key={it.id} className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${meta.color}`}>
                  <meta.icon size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 leading-snug">{it.text}</p>
                  <p className="text-[10px] text-slate-400">{fmtDateTime(it.date)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
