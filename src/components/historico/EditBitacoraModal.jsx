import { useState, useEffect } from "react";
import { X, Edit2, Loader2 } from "lucide-react";
import { Field, inputCls } from "../ui/formPrimitives";

const FUEL_LEVELS = ["Vacío", "1/4", "1/2", "3/4", "Lleno"];

export default function EditBitacoraModal({ open, onClose, bitacora, onSave }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && bitacora) {
      setForm({
        km_inicial: bitacora.km_inicial ?? "",
        km_final: bitacora.km_final ?? "",
        combustible_salida: bitacora.combustible_salida || "Lleno",
        combustible_regreso: bitacora.combustible_regreso || "",
        incidencias: bitacora.incidencias || "",
      });
      setError("");
    }
  }, [open, bitacora]);

  if (!open || !bitacora) return null;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(bitacora.id, {
        km_inicial: form.km_inicial === "" ? null : Number(form.km_inicial),
        km_final: form.km_final === "" ? null : Number(form.km_final),
        combustible_salida: form.combustible_salida || null,
        combustible_regreso: form.combustible_regreso || null,
        incidencias: form.incidencias,
      });
      onClose();
    } catch (err) {
      setError(err.message || "No se pudo actualizar la bitácora.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <Edit2 size={16} className="text-teal-600" /> Editar Bitácora
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6">
          <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
            El registro original de auditoría (Caja Negra) no se modifica — esta corrección solo actualiza el registro de trabajo.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="KM inicial">
              <input type="number" className={inputCls} value={form.km_inicial} onChange={(e) => setForm({ ...form, km_inicial: e.target.value })} />
            </Field>
            <Field label="KM final">
              <input type="number" className={inputCls} value={form.km_final} onChange={(e) => setForm({ ...form, km_final: e.target.value })} />
            </Field>
            <Field label="Combustible salida">
              <select className={inputCls} value={form.combustible_salida} onChange={(e) => setForm({ ...form, combustible_salida: e.target.value })}>
                {FUEL_LEVELS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Combustible regreso">
              <select className={inputCls} value={form.combustible_regreso} onChange={(e) => setForm({ ...form, combustible_regreso: e.target.value })}>
                <option value="">—</option>
                {FUEL_LEVELS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Incidencias">
            <textarea className={inputCls} rows={3} value={form.incidencias} onChange={(e) => setForm({ ...form, incidencias: e.target.value })} />
          </Field>

          {error && <p className="text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg px-3 py-2 mb-4">{error}</p>}

          <button type="submit" disabled={saving} className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
            {saving && <Loader2 size={15} className="animate-spin" />}
            Guardar cambios
          </button>
        </form>
      </div>
    </div>
  );
}
