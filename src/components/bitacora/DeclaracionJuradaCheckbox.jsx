import { Check, ShieldCheck } from "lucide-react";

export const DECLARACION_JURADA_TEXTO =
  "Declaro bajo protesta de decir verdad que el kilometraje, niveles y reporte de daños son correctos y asumo la responsabilidad del vehículo.";

/**
 * Checkbox de UI (no el nativo del navegador) para la declaración jurada.
 * El <input> real sigue en el DOM (sr-only) para teclado y lectores de pantalla.
 */
export default function DeclaracionJuradaCheckbox({ checked, onChange, disabled = false }) {
  return (
    <label
      className={`group flex items-start gap-3.5 rounded-xl border p-4 transition-all duration-200 ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      } ${
        checked
          ? "border-teal-300 bg-teal-50/70 shadow-sm ring-1 ring-teal-200"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70"
      }`}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />

      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-teal-500/60 peer-focus-visible:ring-offset-2 ${
          checked ? "border-teal-600 bg-teal-600" : "border-slate-300 bg-white group-hover:border-slate-400"
        }`}
      >
        <Check
          size={13}
          strokeWidth={3.5}
          className={`text-white transition-all duration-200 ${checked ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}
        />
      </span>

      <span className="flex-1 min-w-0">
        <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-teal-700">
          <ShieldCheck size={12} /> Declaración jurada
        </span>
        <span className="block text-[13px] leading-relaxed text-slate-700">{DECLARACION_JURADA_TEXTO}</span>
      </span>
    </label>
  );
}
