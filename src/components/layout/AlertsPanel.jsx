import { useState, useMemo, useRef, useEffect } from "react";
import { Bell, AlertTriangle, Wrench, Calendar } from "lucide-react";
import { useVehicles } from "../../hooks/useVehicles";
import { useReservations } from "../../hooks/useReservations";
import { todayISO } from "../../lib/dateUtils";

export default function AlertsPanel() {
  const { vehicles } = useVehicles();
  const { reservations } = useReservations();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const alerts = useMemo(() => {
    const list = [];

    vehicles.forEach((v) => {
      const missing = [];
      if (!v.doc_circulacion) missing.push("Tarjeta de Circulación");
      if (!v.doc_seguro) missing.push("Seguro");
      if (!v.doc_verificacion) missing.push("Verificación");
      if (missing.length) {
        list.push({
          type: "doc",
          icon: AlertTriangle,
          color: "text-rose-600 bg-rose-50",
          text: `${v.identifier || v.plate}: falta ${missing.join(", ")}`,
        });
      }
      if (v.status === "mantenimiento") {
        list.push({
          type: "maint",
          icon: Wrench,
          color: "text-amber-600 bg-amber-50",
          text: `${v.identifier || v.plate} está en mantenimiento`,
        });
      }
    });

    const today = todayISO();
    reservations
      .filter((r) => r.start_date <= today && r.end_date >= today)
      .forEach((r) => {
        const v = vehicles.find((x) => x.id === r.vehicle_id);
        if (v && (v.status === "disponible" || v.status === "reservado")) {
          list.push({
            type: "res",
            icon: Calendar,
            color: "text-blue-600 bg-blue-50",
            text: `Reserva activa de ${v.identifier || v.plate} sin check-out registrado`,
          });
        }
      });

    return list;
  }, [vehicles, reservations]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition"
        title="Alertas"
      >
        <Bell size={17} />
        {alerts.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
            {alerts.length > 9 ? "9+" : alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-50">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-700">Alertas ({alerts.length})</p>
          </div>
          {alerts.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Sin alertas activas.</p>
          ) : (
            <div className="p-2">
              {alerts.map((a, i) => (
                <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-50">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${a.color}`}>
                    <a.icon size={13} />
                  </div>
                  <p className="text-xs text-slate-600 leading-snug pt-1">{a.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
