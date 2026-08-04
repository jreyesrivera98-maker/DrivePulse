import { useEffect, useState } from "react";
import { X, ClipboardList, Loader2, MapPin, ExternalLink } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

const FUEL_TO_PCT = { "Vacío": 0.04, "1/4": 0.25, "1/2": 0.5, "3/4": 0.75, "Lleno": 1 };

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function FuelGauge({ level }) {
  if (!level) return <span className="text-slate-400">—</span>;
  const pct = FUEL_TO_PCT[level] ?? 0.5;
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-teal-500" style={{ width: `${pct * 100}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-600">{level}</span>
    </div>
  );
}

export default function BitacoraDetailModal({ open, onClose, bitacora }) {
  const [danios, setDanios] = useState([]);
  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !bitacora) return;
    let active = true;
    setLoading(true);
    Promise.all([
      supabase.from("bitacora_danios").select("*").eq("bitacora_id", bitacora.id),
      supabase.from("fuel_vouchers").select("*").eq("bitacora_id", bitacora.id).maybeSingle(),
    ]).then(([d, v]) => {
      if (!active) return;
      setDanios(d.data || []);
      setVoucher(v.data || null);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [open, bitacora]);

  if (!open || !bitacora) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <ClipboardList size={16} className="text-teal-600" /> Detalle de Bitácora
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-4 mb-5 text-xs">
            <div className="bg-slate-50 rounded-lg p-3"><p className="text-slate-400">Vehículo</p><p className="font-semibold text-slate-700">{bitacora.vehicles?.brand} {bitacora.vehicles?.model} — {bitacora.vehicles?.plate}</p></div>
            <div className="bg-slate-50 rounded-lg p-3"><p className="text-slate-400">Colaborador</p><p className="font-semibold text-slate-700">{bitacora.profiles?.name}</p></div>
            <div className="bg-slate-50 rounded-lg p-3"><p className="text-slate-400">Proyecto / Destino</p><p className="font-semibold text-slate-700">{bitacora.proyecto} — {bitacora.destino}</p></div>
            <div className="bg-slate-50 rounded-lg p-3"><p className="text-slate-400">Autorizado por</p><p className="font-semibold text-slate-700">{bitacora.autorizado_por || "—"}</p></div>
            <div className="bg-slate-50 rounded-lg p-3"><p className="text-slate-400">Fecha de registro</p><p className="font-semibold text-slate-700">{fmtDateTime(bitacora.created_at)}</p></div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-slate-400">Coordenadas GPS</p>
              {bitacora.gps_lat ? (
                <a target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${bitacora.gps_lat},${bitacora.gps_lng}`} className="font-semibold text-teal-600 flex items-center gap-1 hover:underline">
                  <MapPin size={12} /> Ver en mapa <ExternalLink size={11} />
                </a>
              ) : <p className="text-slate-400">No capturado</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="border border-slate-100 rounded-xl p-3">
              <p className="text-[11px] text-slate-400 mb-1">KM inicial → final</p>
              <p className="text-sm font-semibold text-slate-700">{bitacora.km_inicial ?? "—"} → {bitacora.km_final ?? "—"}</p>
            </div>
            <div className="border border-slate-100 rounded-xl p-3">
              <p className="text-[11px] text-slate-400 mb-1">Combustible salida / regreso</p>
              <div className="flex gap-3">
                <FuelGauge level={bitacora.combustible_salida} />
                <FuelGauge level={bitacora.combustible_regreso} />
              </div>
            </div>
          </div>

          {bitacora.incidencias && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-slate-500 mb-1">Incidencias</p>
              <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{bitacora.incidencias}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-4"><Loader2 size={14} className="animate-spin" /> Cargando evidencia…</div>
          ) : (
            <>
              <div className="mb-5">
                <p className="text-xs font-semibold text-slate-500 mb-2">Zonas de desperfecto reportadas</p>
                {danios.length === 0 ? (
                  <p className="text-xs text-emerald-600">Sin desperfectos reportados.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {danios.map((d) => (
                      <div key={d.id} className="border border-rose-100 bg-rose-50/40 rounded-lg p-2.5">
                        <p className="text-xs font-semibold text-rose-700 capitalize">{d.zona.replace("_", " ")}</p>
                        {d.nota && <p className="text-[11px] text-slate-600 mt-0.5">{d.nota}</p>}
                        {d.foto_url && <img src={d.foto_url} alt="" className="mt-2 rounded-md w-full h-20 object-cover" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {voucher && (
                <div className="mb-5 border border-slate-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Voucher de combustible</p>
                  <p className="text-xs text-slate-600">{voucher.litros} L · ${voucher.monto} · {voucher.estacion}</p>
                  {voucher.imagen_url && <a href={voucher.imagen_url} target="_blank" rel="noreferrer" className="text-teal-600 text-[11px] font-semibold hover:underline">Ver ticket →</a>}
                </div>
              )}

              {bitacora.firma_url && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">Firma digital</p>
                  <img src={bitacora.firma_url} className="border border-slate-200 rounded-lg bg-white h-20 object-contain" alt="Firma" />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
