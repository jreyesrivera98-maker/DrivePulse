import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Filter, Plus } from "lucide-react";
import { addDays, fmtShort, dayLabel, startOfWeek, todayISO } from "../../lib/dateUtils";

export default function WeeklyCalendar({ vehicles, reservations, bitacoras, isAdmin, weekOffset, setWeekOffset, onDrop, onNewReservation }) {
  const weekStart = addDays(startOfWeek(todayISO()), weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [selectedVehicles, setSelectedVehicles] = useState(vehicles.map((v) => v.id));
  const [dragged, setDragged] = useState(null);

  useEffect(() => {
    setSelectedVehicles((prev) => {
      const ids = vehicles.map((v) => v.id);
      // conserva selección previa, agrega vehículos nuevos por default
      const keep = prev.filter((id) => ids.includes(id));
      const added = ids.filter((id) => !prev.includes(id));
      return prev.length === 0 ? ids : [...keep, ...added];
    });
  }, [vehicles]);

  const toggleVehicle = (id) => setSelectedVehicles((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const visibleVehicles = vehicles.filter((v) => selectedVehicles.includes(v.id));

  const handleDrop = (vehicleId, dayIso) => {
    if (!isAdmin || !dragged) return;
    const r = reservations.find((x) => x.id === dragged);
    setDragged(null);
    if (!r) return;
    const duration = (new Date(r.end_date) - new Date(r.start_date)) / 86400000;
    onDrop(r.id, { vehicleId, start: dayIso, end: addDays(dayIso, duration) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Calendario de Reservas</h1>
          <p className="text-sm text-slate-500">
            {isAdmin ? "Arrastra una reserva para reprogramarla." : "Consulta la disponibilidad de la flotilla."}
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2.5 h-2.5 rounded-sm bg-amber-200 border border-amber-300" /> Reserva</span>
            <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2.5 h-2.5 rounded-sm bg-blue-200 border border-blue-300" /> Viaje en curso</span>
            <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2.5 h-2.5 rounded-sm bg-teal-200 border border-teal-300" /> Uso registrado</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset((w) => w - 1)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50">
            <ChevronLeft size={15} />
          </button>
          <span className="text-xs font-semibold text-slate-600 w-40 text-center">
            {fmtShort(days[0])} – {fmtShort(days[6])}
          </span>
          <button onClick={() => setWeekOffset((w) => w + 1)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50">
            <ChevronRight size={15} />
          </button>
          <button onClick={onNewReservation} className="ml-2 flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg px-3 py-2">
            <Plus size={14} /> Nueva reserva
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Filter size={13} /> Filtrar unidades
          </p>
          <div className="flex gap-2">
            <button onClick={() => setSelectedVehicles(vehicles.map((v) => v.id))} className="text-[11px] font-medium text-teal-600 hover:underline">
              Seleccionar todos
            </button>
            <button onClick={() => setSelectedVehicles([])} className="text-[11px] font-medium text-slate-400 hover:underline">
              Desmarcar todos
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {vehicles.map((v) => (
            <label
              key={v.id}
              className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border cursor-pointer transition ${
                selectedVehicles.includes(v.id) ? "bg-teal-50 border-teal-200 text-teal-700" : "border-slate-200 text-slate-500"
              }`}
            >
              <input type="checkbox" className="accent-teal-600" checked={selectedVehicles.includes(v.id)} onChange={() => toggleVehicle(v.id)} />
              {v.plate}
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[160px_repeat(7,1fr)] border-b border-slate-100">
            <div className="p-3 text-[11px] font-bold text-slate-400 uppercase">Vehículo</div>
            {days.map((d) => (
              <div key={d} className="p-3 text-center border-l border-slate-100">
                <p className="text-[11px] font-bold text-slate-500 uppercase">{dayLabel(d)}</p>
                <p className={`text-xs font-semibold ${d === todayISO() ? "text-teal-600" : "text-slate-700"}`}>{fmtShort(d)}</p>
              </div>
            ))}
          </div>

          {visibleVehicles.map((v) => (
            <div key={v.id} className="grid grid-cols-[160px_repeat(7,1fr)] border-b border-slate-50 last:border-0">
              <div className="p-3 flex items-center gap-2">
                {v.photo_url && <img src={v.photo_url} className="w-8 h-7 rounded object-cover" alt="" />}
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-700 truncate">
                    {v.brand} {v.model}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">{v.plate}</p>
                </div>
              </div>
              {days.map((d) => {
                const dayReservations = reservations.filter((r) => r.vehicle_id === v.id && d >= r.start_date && d <= r.end_date);
                const dayUsage = (bitacoras || []).filter((b) => {
                  if (b.vehicle_id !== v.id) return false;
                  const start = b.created_at?.slice(0, 10);
                  const end = b.closed_at ? b.closed_at.slice(0, 10) : todayISO();
                  return start && d >= start && d <= end;
                });
                return (
                  <div
                    key={d}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(v.id, d)}
                    className="border-l border-slate-50 p-1.5 min-h-[56px] hover:bg-slate-50/50 transition"
                  >
                    {dayReservations.map((r) => (
                      <div
                        key={r.id}
                        draggable={isAdmin}
                        onDragStart={() => setDragged(r.id)}
                        title={`Reserva: ${r.profiles?.name || ""} · ${r.project || ""}`}
                        className={`text-[10px] rounded-md px-1.5 py-1 mb-1 font-medium truncate bg-amber-100 text-amber-800 border border-amber-200 ${
                          isAdmin ? "cursor-grab active:cursor-grabbing" : ""
                        }`}
                      >
                        {r.profiles?.name?.split(" ")[0] || "—"} · {r.destino || r.project || "Viaje"}
                      </div>
                    ))}
                    {dayUsage.map((b) => (
                      <div
                        key={b.id}
                        title={`Uso real: ${b.profiles?.name || ""} · ${b.proyecto || ""}${b.estado === "abierta" ? " · viaje en curso" : ""}`}
                        className={`text-[10px] rounded-md px-1.5 py-1 mb-1 font-medium truncate border ${
                          b.estado === "abierta" ? "bg-blue-100 text-blue-800 border-blue-200" : "bg-teal-100 text-teal-800 border-teal-200"
                        }`}
                      >
                        🚗 {b.profiles?.name?.split(" ")[0] || "—"}{b.estado === "abierta" ? " (en curso)" : ""}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
          {visibleVehicles.length === 0 && <p className="text-sm text-slate-400 text-center py-10">Selecciona al menos una unidad para ver el calendario.</p>}
        </div>
      </div>
    </div>
  );
}
