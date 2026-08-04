import { useState, useEffect } from "react";
import { X, Car, Loader2, Upload } from "lucide-react";
import { uploadFile, BUCKETS } from "../../lib/supabaseClient";
import { Field, inputCls } from "../ui/formPrimitives";

const CATEGORIES = ["Sedán", "SUV", "Pickup", "Van"];
const STATUSES = [
  { v: "disponible", label: "Disponible" },
  { v: "en_uso", label: "En Uso" },
  { v: "reservado", label: "Reservado" },
  { v: "mantenimiento", label: "Mantenimiento" },
];
const FUEL_LEVELS = ["Vacío", "1/4", "1/2", "3/4", "Lleno"];

const emptyForm = {
  identifier: "",
  plate: "",
  brand: "",
  model: "",
  year: new Date().getFullYear(),
  category: "Sedán",
  status: "disponible",
  km: 0,
  fuel: "Lleno",
  photo_url: null,
  doc_circulacion: true,
  doc_seguro: true,
  doc_verificacion: true,
  doc_licencia_asociada: true,
};

export default function VehicleModal({ open, onClose, onSave, editing }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(editing || emptyForm);
      setError("");
    }
  }, [open, editing]);

  if (!open) return null;

  const handlePhoto = async (file) => {
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${form.plate || "vehiculo"}-${Date.now()}.${ext}`;
      const url = await uploadFile(BUCKETS.vehiclePhotos, path, file, { isPublic: true });
      setForm((f) => ({ ...f, photo_url: url }));
    } catch (err) {
      setError(err.message || "No se pudo subir la fotografía.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.identifier || !form.plate || !form.brand || !form.model) {
      setError("Completa identificador, placas, marca y modelo.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({ ...form, km: Number(form.km) || 0, year: Number(form.year) || null });
      onClose();
    } catch (err) {
      setError(err.message || "No se pudo guardar el vehículo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <Car size={16} className="text-teal-600" /> {editing ? "Editar Vehículo" : "Nuevo Vehículo"}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6">
          <Field label="Fotografía del vehículo">
            <div className="flex items-center gap-3">
              {form.photo_url && <img src={form.photo_url} alt="" className="w-16 h-14 rounded-lg object-cover border border-slate-200" />}
              <label className="flex-1 border border-dashed border-slate-300 rounded-lg py-2.5 text-xs text-center text-slate-500 hover:border-teal-400 hover:text-teal-600 cursor-pointer flex items-center justify-center gap-1.5">
                {uploadingPhoto ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                {uploadingPhoto ? "Subiendo..." : "Subir fotografía"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhoto(e.target.files[0])} disabled={uploadingPhoto} />
              </label>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Identificador" required>
              <input className={inputCls} value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} placeholder="Ej. VW-AMA" />
            </Field>
            <Field label="Placas" required>
              <input className={inputCls} value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} placeholder="Ej. PX-2672-B" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Marca" required>
              <input className={inputCls} value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Ej. Volkswagen" />
            </Field>
            <Field label="Modelo" required>
              <input className={inputCls} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Ej. Amarok" />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Año">
              <input type="number" className={inputCls} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
            </Field>
            <Field label="Categoría">
              <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Estado">
              <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Kilometraje">
              <input type="number" className={inputCls} value={form.km} onChange={(e) => setForm({ ...form, km: e.target.value })} />
            </Field>
            <Field label="Combustible">
              <select className={inputCls} value={form.fuel} onChange={(e) => setForm({ ...form, fuel: e.target.value })}>
                {FUEL_LEVELS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </Field>
          </div>

          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 mt-2">Documentos vigentes</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <label className="flex items-center gap-2 text-xs text-slate-600 border border-slate-100 rounded-lg px-3 py-2">
              <input type="checkbox" className="accent-teal-600" checked={form.doc_circulacion} onChange={(e) => setForm({ ...form, doc_circulacion: e.target.checked })} />
              Tarjeta de Circulación
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600 border border-slate-100 rounded-lg px-3 py-2">
              <input type="checkbox" className="accent-teal-600" checked={form.doc_seguro} onChange={(e) => setForm({ ...form, doc_seguro: e.target.checked })} />
              Seguro Vigente
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600 border border-slate-100 rounded-lg px-3 py-2">
              <input type="checkbox" className="accent-teal-600" checked={form.doc_verificacion} onChange={(e) => setForm({ ...form, doc_verificacion: e.target.checked })} />
              Verificación
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600 border border-slate-100 rounded-lg px-3 py-2">
              <input type="checkbox" className="accent-teal-600" checked={form.doc_licencia_asociada} onChange={(e) => setForm({ ...form, doc_licencia_asociada: e.target.checked })} />
              Licencia Asociada
            </label>
          </div>

          {error && <p className="text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg px-3 py-2 mb-4">{error}</p>}

          <button type="submit" disabled={saving || uploadingPhoto} className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
            {saving && <Loader2 size={15} className="animate-spin" />}
            Guardar
          </button>
        </form>
      </div>
    </div>
  );
}
