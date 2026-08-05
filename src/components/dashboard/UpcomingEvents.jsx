import { useMemo } from "react";
import { CalendarClock, Wrench, Calendar } from "lucide-react";
import { todayISO, fmtDate } from "../../lib/dateUtils";

export default function UpcomingEvents({ maintenance, reservations, vehicles }) {
  const events = useMemo(() => {
    const today = todayISO();
    const findVehicle = (id) => vehicles.find((v) => v.id === id);
    const list = [];

    maintenance
      .filter((m) => m.estado === "Programado" && m.fecha >= today)
      .forEach((m) =>
        list.push({
          id: `m-${m.id}`,
          date: m.fecha,
          icon: Wrench,
          color: "text-amber-600 bg-amber-50",
          text: `${m.tipo}: ${findVehicle(m.vehicle_id)?.identifier || findVehicle(m.vehicle_id)?.plate || "—"}`,
        })
      );

    reservations
      .filter((r) => r.start_date >= today)
      .forEach((r) =>
        list.push({
          id: `r-${r.id}`,
          date: r.start_date,
          icon: Calendar,
          color: "text-blue-600 bg-blue-50",
          text: `Reserva: ${findVehicle(r.vehicle_id)?.identifier || findVehicle(r.vehicle_id)?.plate || "—"} — ${r.destino || r.project || ""}`,
        })
      );

    return list.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);
  }, [maintenance, reservations, vehicles]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
        <CalendarClock size={15} className="text-teal-600" /> Próximos eventos
      </h3>
      {events.length === 0 ? (
        <p className="text-xs text-slate-400 py-6 text-center">Sin eventos próximos programados.</p>
      ) : (
        <div className="space-y-3">
          {events.map((e) => (
            <div key={e.id} className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${e.color}`}>
                <e.icon size={13} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-700 truncate">{e.text}</p>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 shrink-0">{fmtDate(e.date)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
