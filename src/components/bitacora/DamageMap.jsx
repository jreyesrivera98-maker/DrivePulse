import { useState } from "react";
import { Camera, Loader2, CheckCircle2 } from "lucide-react";
import { uploadFile, BUCKETS } from "../../lib/supabaseClient";

const DAMAGE_ZONES = [
  { id: "frontal", label: "Frontal", x: 148, y: 20, w: 64, h: 46 },
  { id: "trasera", label: "Trasera", x: 148, y: 234, w: 64, h: 46 },
  { id: "lat_izq", label: "Lateral Izq.", x: 40, y: 90, w: 44, h: 120 },
  { id: "lat_der", label: "Lateral Der.", x: 276, y: 90, w: 44, h: 120 },
  { id: "otras", label: "Otras / Toldo", x: 148, y: 96, w: 64, h: 108 },
];

export default function DamageMap({ damages, onChange, vehicleId, toast }) {
  const [uploadingZone, setUploadingZone] = useState(null);

  const toggleZone = (zoneId) => {
    const exists = damages.find((d) => d.zone === zoneId);
    if (exists) {
      onChange(damages.filter((d) => d.zone !== zoneId));
    } else {
      onChange([...damages, { zone: zoneId, note: "", fotoUrl: null }]);
    }
  };

  const updateNote = (zoneId, note) => onChange(damages.map((d) => (d.zone === zoneId ? { ...d, note } : d)));

  const handleFile = async (zoneId, file) => {
    if (!file) return;
    setUploadingZone(zoneId);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${vehicleId}/${Date.now()}_${zoneId}.${ext}`;
      const url = await uploadFile(BUCKETS.evidencePhotos, path, file);
      onChange(damages.map((d) => (d.zone === zoneId ? { ...d, fotoUrl: url } : d)));
      toast("Evidencia adjuntada.");
    } catch (err) {
      toast(err.message || "No se pudo subir la evidencia.", "error");
    } finally {
      setUploadingZone(null);
    }
  };

  return (
    <div className="grid md:grid-cols-[220px_1fr] gap-5">
      <div className="flex justify-center">
        <svg width={220} height={300} viewBox="0 0 360 300">
          <rect x="120" y="10" width="120" height="280" rx="28" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
          <rect x="140" y="70" width="80" height="60" rx="8" fill="#e2e8f0" />
          {DAMAGE_ZONES.map((z) => {
            const isDamaged = damages.some((d) => d.zone === z.id);
            return (
              <rect
                key={z.id}
                x={z.x} y={z.y} width={z.w} height={z.h} rx={8}
                fill={isDamaged ? "#fecaca" : "transparent"}
                stroke={isDamaged ? "#ef4444" : "#94a3b8"}
                strokeWidth={isDamaged ? 2 : 1}
                strokeDasharray={isDamaged ? "0" : "4 3"}
                className="cursor-pointer"
                onClick={() => toggleZone(z.id)}
              />
            );
          })}
        </svg>
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-3">Haz clic en una zona del vehículo para marcar un desperfecto y adjuntar evidencia.</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {DAMAGE_ZONES.map((z) => {
            const isDamaged = damages.some((d) => d.zone === z.id);
            return (
              <button
                key={z.id}
                type="button"
                onClick={() => toggleZone(z.id)}
                className={`text-[11px] px-2.5 py-1.5 rounded-lg border font-medium transition ${isDamaged ? "bg-rose-50 border-rose-200 text-rose-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
              >
                {z.label}
              </button>
            );
          })}
        </div>
        {damages.length === 0 && (
          <p className="text-xs text-emerald-600 flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
            <CheckCircle2 size={13} /> Sin desperfectos reportados.
          </p>
        )}
        {damages.map((d) => {
          const zone = DAMAGE_ZONES.find((z) => z.id === d.zone);
          const uploading = uploadingZone === d.zone;
          return (
            <div key={d.zone} className="border border-rose-100 bg-rose-50/50 rounded-xl p-3 mb-2">
              <p className="text-xs font-semibold text-rose-700 mb-1.5">{zone?.label}</p>
              <input
                value={d.note}
                onChange={(e) => updateNote(d.zone, e.target.value)}
                placeholder="Describe el desperfecto..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs mb-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
              />
              <label className={`text-[11px] flex items-center gap-1.5 font-medium cursor-pointer ${d.fotoUrl ? "text-emerald-600" : "text-slate-500 hover:text-teal-600"}`}>
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
                {uploading ? "Subiendo..." : d.fotoUrl ? "Evidencia adjuntada" : "Adjuntar foto de evidencia"}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(d.zone, e.target.files[0])} disabled={uploading} />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
