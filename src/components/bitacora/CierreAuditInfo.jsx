import { Fingerprint, EyeOff, MapPin, ExternalLink, Clock } from "lucide-react";

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/**
 * Resumen de solo lectura de la caja negra de un cierre
 * (método de firma, hora del sistema y ubicación de la entrega).
 *
 * @param {{ cajaNegra?: import("../../lib/cajaNegra").CajaNegra | null, titulo?: string }} props
 */
export default function CierreAuditInfo({ cajaNegra, titulo = "Firma y auditoría del cierre" }) {
  if (!cajaNegra) return null;
  const biometrica = cajaNegra.metodo_firma === "biometrica";
  const coords = cajaNegra.coordenadas_entrega;

  return (
    <div className="border border-slate-100 rounded-xl p-3 text-xs space-y-2">
      <p className="font-semibold text-slate-500">{titulo}</p>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold ${
            biometrica ? "bg-teal-50 text-teal-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          {biometrica ? <Fingerprint size={12} /> : <EyeOff size={12} />}
          {cajaNegra.metodo_descripcion || (biometrica ? "Biometría nativa (WebAuthn)" : "Checkbox + Auditoría Ciega")}
        </span>
        {cajaNegra.declaracion_jurada && <span className="text-slate-500">Declaración jurada aceptada</span>}
      </div>
      <p className="flex items-center gap-1.5 text-slate-600">
        <Clock size={12} className="text-slate-400" /> {fmtDateTime(cajaNegra.timestamp_cierre)}
      </p>
      {coords?.lat != null && (
        <a
          target="_blank"
          rel="noreferrer"
          href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
          className="inline-flex items-center gap-1 font-semibold text-teal-600 hover:underline"
        >
          <MapPin size={12} /> {Number(coords.lat).toFixed(5)}, {Number(coords.lng).toFixed(5)} <ExternalLink size={11} />
        </a>
      )}
      {!biometrica && cajaNegra.motivo_fallback && (
        <p className="text-[11px] text-slate-400">Motivo: {cajaNegra.motivo_fallback.replace(/_/g, " ")}</p>
      )}
    </div>
  );
}
