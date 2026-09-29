import { Fingerprint, Loader2, MapPin, Lock } from "lucide-react";
import DeclaracionJuradaCheckbox from "./DeclaracionJuradaCheckbox";

// Clases estáticas (Tailwind no detecta nombres armados dinámicamente).
const ACCENTS = {
  teal: "bg-teal-600 hover:bg-teal-700 focus-visible:ring-teal-500/60",
  blue: "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500/60",
};

const STAGE_LABELS = {
  auth: "Verificando identidad…",
  gps: "Obteniendo ubicación GPS…",
  saving: "Guardando bitácora…",
};

/**
 * Reemplaza al antiguo recuadro de firma gráfica: declaración jurada +
 * botón "Autenticar y Firmar". El botón está deshabilitado (visual y
 * funcionalmente) hasta que se marque la declaración.
 *
 * @param {Object} props
 * @param {boolean} props.declaracion
 * @param {(v: boolean) => void} props.onDeclaracionChange
 * @param {"idle" | "auth" | "gps" | "saving"} props.stage
 * @param {boolean} [props.showBlindFallback]  mostrar "continuar sin biometría" (tras cancelar la huella)
 * @param {() => void} [props.onBlindFallback]
 * @param {"teal" | "blue"} [props.accent]
 */
export default function SignOffSection({
  declaracion,
  onDeclaracionChange,
  stage,
  showBlindFallback = false,
  onBlindFallback,
  accent = "teal",
}) {
  const busy = stage !== "idle";
  const disabled = !declaracion || busy;

  return (
    <div className="space-y-3">
      <DeclaracionJuradaCheckbox checked={declaracion} onChange={onDeclaracionChange} disabled={busy} />

      <button
        type="submit"
        disabled={disabled}
        aria-busy={busy}
        className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
          ACCENTS[accent]
        } ${!declaracion ? "cursor-not-allowed opacity-50" : busy ? "cursor-wait opacity-90" : "active:scale-[0.99]"}`}
      >
        {busy ? <Loader2 size={17} className="animate-spin" /> : <Fingerprint size={18} />}
        {busy ? STAGE_LABELS[stage] : "Autenticar y Firmar"}
      </button>

      {showBlindFallback && !busy && (
        <button
          type="button"
          onClick={(e) => {
            // Al no ser un submit, se valida el formulario a mano (campos required).
            if (e.currentTarget.form && !e.currentTarget.form.reportValidity()) return;
            onBlindFallback?.();
          }}
          disabled={!declaracion}
          className="w-full text-center text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          ¿No puedes usar biometría? Continuar con Checkbox + Auditoría Ciega
        </button>
      )}

      <p className="flex items-start justify-center gap-1.5 text-center text-[11px] leading-snug text-slate-400">
        <Lock size={11} className="mt-px shrink-0" />
        <span>
          Al firmar se registran de forma inmutable la fecha, la hora y la ubicación <MapPin size={10} className="inline -mt-0.5" /> GPS del cierre.
        </span>
      </p>
    </div>
  );
}
