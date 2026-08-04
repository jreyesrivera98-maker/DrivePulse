import { useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { uploadFile, BUCKETS } from "../../lib/supabaseClient";

/**
 * Fotos generales adjuntas a "Incidencias/observaciones", separadas
 * del mapa de desperfectos (esas van ligadas a una zona específica
 * del vehículo). Útil para evidencia que no corresponde a una zona
 * fija: por ejemplo el interior sucio, un objeto olvidado, algo
 * fuera de las 5 zonas del mapa, etc.
 */
export default function IncidenciaFotos({ fotos, onChange, vehicleId, toast }) {
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${vehicleId}/incidencia-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const url = await uploadFile(BUCKETS.evidencePhotos, path, file);
        uploaded.push(url);
      }
      onChange([...fotos, ...uploaded]);
      toast(`${uploaded.length === 1 ? "Foto adjuntada" : `${uploaded.length} fotos adjuntadas`}.`);
    } catch (err) {
      toast(err.message || "No se pudo subir la evidencia.", "error");
    } finally {
      setUploading(false);
    }
  };

  const remove = (url) => onChange(fotos.filter((f) => f !== url));

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2 mb-2">
        {fotos.map((url) => (
          <div key={url} className="relative group">
            <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover border border-slate-200" />
            <button
              type="button"
              onClick={() => remove(url)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              title="Quitar foto"
            >
              <X size={11} />
            </button>
          </div>
        ))}
      </div>
      <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-teal-600 cursor-pointer">
        {uploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
        {uploading ? "Subiendo..." : "Adjuntar fotos de evidencia"}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading}
        />
      </label>
    </div>
  );
}
