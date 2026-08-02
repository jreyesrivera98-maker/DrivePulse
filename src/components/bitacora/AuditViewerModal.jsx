import { X, ShieldCheck, MapPin, ExternalLink } from "lucide-react";

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AuditViewerModal({ open, onClose, record, vehicle, userName }) {
  if (!open || !record) return null;
  const snapshot = record.snapshot || {};
  const gps = snapshot.gps;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <ShieldCheck size={16} className="text-teal-600" /> Caja Negra Vehicular — Registro Inmutable
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-4 mb-4 text-xs">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-slate-400">Vehículo</p>
              <p className="font-semibold text-slate-700">{vehicle ? `${vehicle.brand} ${vehicle.model} — ${vehicle.plate}` : "—"}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-slate-400">Colaborador</p>
              <p className="font-semibold text-slate-700">{userName || "—"}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-slate-400">Timestamp del servidor</p>
              <p className="font-semibold text-slate-700">{fmtDateTime(record.created_at)}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-slate-400">Coordenadas GPS</p>
              {gps?.lat ? (
                <a
                  target="_blank" rel="noreferrer"
                  href={`https://www.google.com/maps?q=${gps.lat},${gps.lng}`}
                  className="font-semibold text-teal-600 flex items-center gap-1 hover:underline"
                >
                  <MapPin size={12} /> {Number(gps.lat).toFixed(5)}, {Number(gps.lng).toFixed(5)} <ExternalLink size={11} />
                </a>
              ) : (
                <p className="text-slate-400">No capturado</p>
              )}
            </div>
          </div>

          {snapshot.firma_url && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 mb-1">Firma digital capturada</p>
              <img src={snapshot.firma_url} className="border border-slate-200 rounded-lg bg-white h-24 object-contain" alt="Firma" />
            </div>
          )}

          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-500 mb-1">Hash de integridad (SHA-256)</p>
            <p className="font-mono text-[11px] bg-slate-900 text-teal-300 rounded-lg px-3 py-2 break-all">{record.hash}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">Snapshot JSONB completo (auditoria_logs)</p>
            <pre className="bg-slate-900 text-slate-200 text-[10px] rounded-lg p-3 overflow-x-auto max-h-64">{JSON.stringify(snapshot, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
