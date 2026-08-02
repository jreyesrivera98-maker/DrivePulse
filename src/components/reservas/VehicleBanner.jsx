import { Gauge, Fuel, Building2, QrCode } from "lucide-react";
import { Link } from "react-router-dom";
import Badge from "../ui/Badge";

const FUEL_TO_PCT = { "Vacío": 0.04, "1/4": 0.25, "1/2": 0.5, "3/4": 0.75, "Lleno": 1 };

const DOC_ITEMS = [
  { key: "doc_circulacion", label: "Tarjeta de Circulación" },
  { key: "doc_seguro", label: "Seguro Vigente" },
  { key: "doc_verificacion", label: "Verificación Vehicular" },
  { key: "doc_licencia_asociada", label: "Licencia del Conductor Asociado" },
];

export default function VehicleBanner({ vehicle }) {
  if (!vehicle) return null;
  const pct = FUEL_TO_PCT[vehicle.fuel] ?? 0.5;

  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row">
      {vehicle.photo_url && (
        <div className="md:w-64 h-40 md:h-auto shrink-0">
          <img src={vehicle.photo_url} alt={vehicle.model} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex-1 p-5">
        <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {vehicle.brand} {vehicle.model} <span className="text-slate-400 font-medium">· {vehicle.year}</span>
            </h2>
            <p className="text-sm font-mono text-slate-500 tracking-wide">
              {vehicle.plate} · {vehicle.category}
            </p>
          </div>
          <Badge status={vehicle.status} />
        </div>
        <div className="flex flex-wrap items-center gap-5 mb-3">
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <Gauge size={14} className="text-slate-400" /> {vehicle.km.toLocaleString()} km
          </div>
          <div className="flex items-center gap-2">
            <Fuel size={14} className="text-slate-400" />
            <div className="w-20 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-teal-500" style={{ width: `${pct * 100}%` }} />
            </div>
            <span className="text-[11px] font-medium text-slate-500">{vehicle.fuel}</span>
          </div>
          {vehicle.project && (
            <div className="flex items-center gap-1.5 text-sm text-slate-600">
              <Building2 size={14} className="text-slate-400" /> {vehicle.project}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {DOC_ITEMS.map((d) => (
              <span
                key={d.key}
                className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full font-medium border ${
                  vehicle[d.key] ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {d.label}
              </span>
            ))}
          </div>
          <Link to={`/vehiculo/${vehicle.id}`} className="text-[11px] font-semibold text-teal-600 hover:underline flex items-center gap-1 shrink-0">
            <QrCode size={12} /> Ver código QR
          </Link>
        </div>
      </div>
    </div>
  );
}
