import { useMemo } from "react";

export const inputCls =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition";

export function Field({ label, children, required }) {
  return (
    <label className="block mb-4">
      <span className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

export function PasswordStrength({ value }) {
  const score = useMemo(() => {
    let s = 0;
    if (value.length >= 8) s++;
    if (/[A-Z]/.test(value)) s++;
    if (/[0-9]/.test(value)) s++;
    if (/[^A-Za-z0-9]/.test(value)) s++;
    return s;
  }, [value]);

  const labels = ["Muy débil", "Débil", "Media", "Fuerte", "Muy fuerte"];
  const colors = ["#ef4444", "#ef4444", "#eab308", "#22c55e", "#0d9488"];

  return (
    <div className="mt-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: score > i ? "100%" : "0%", background: colors[score] }}
            />
          </div>
        ))}
      </div>
      {value.length > 0 && (
        <p className="text-[11px] mt-1 font-medium" style={{ color: colors[score] }}>
          {labels[score]} {value.length < 8 && "· mínimo 8 caracteres"}
        </p>
      )}
    </div>
  );
}
