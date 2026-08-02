import { useState, useEffect } from "react";
import { X, Wrench, Loader2 } from "lucide-react";
import { Field, inputCls } from "../ui/formPrimitives";

const emptyForm = { vehicle_id: "", tipo: "Preventivo", taller: "", descripcion: "", costo: "", estado: "Programado", fecha: new Date().toISOString().slice(0, 10) };

export default function MaintenanceModal({ open, onClose, vehicles, onSave, editing }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(editing ? { ...editing, costo: String(editing.costo) } : { ...emptyForm, vehicle_id: vehicles[0]?.id || "" });
      setError("");
    }
  }, [open, editing, vehicles]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.vehicle_id || !form.taller || !form.descripcion) {
      setError("Completa vehículo, taller y descripción.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({ ...form, costo: Number(form.costo) || 0 });
      onClose();
    } catch (err) {
      setError(err.message || "No se pudo guardar el mantenimiento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <Wrench size={16} className="text-teal-600" /> {editing ? "Editar Mantenimiento" : "Nuevo Mantenimiento"}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6">
          <Field label="Vehículo" required>
            <select className={inputCls} value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.brand} {v.model} — {v.plate}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <select className={inputCls} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <option>Preventivo</option>
                <option>Correctivo</option>
              </select>
            </Field>
            <Field label="Estado">
              <select className={inputCls} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                <option>Programado</option>
                <option>En proceso</option>
                <option>Completado</option>
              </select>
            </Field>
          </div>
          <Field label="Taller / Proveedor" required>
            <input className={inputCls} value={form.taller} onChange={(e) => setForm({ ...form, taller: e.target.value })} />
          </Field>
          <Field label="Descripción" required>
            <textarea className={inputCls} rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Costo ($)">
              <input type="number" className={inputCls} value={form.costo} onChange={(e) => setForm({ ...form, costo: e.target.value })} />
            </Field>
            <Field label="Fecha">
              <input type="date" className={inputCls} value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            </Field>
          </div>

          {error && <p className="text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg px-3 py-2 mb-4">{error}</p>}

          <button type="submit" disabled={saving} className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold mt-2 flex items-center justify-center gap-2 disabled:opacity-60">
            {saving && <Loader2 size={15} className="animate-spin" />}
            Guardar
          </button>
        </form>
      </div>
    </div>
  );
}
