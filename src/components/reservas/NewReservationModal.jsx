import { useState, useEffect } from "react";
import { X, Calendar, Loader2 } from "lucide-react";
import { Field, inputCls } from "../ui/formPrimitives";
import { todayISO } from "../../lib/dateUtils";

export default function NewReservationModal({ open, onClose, vehicles, profiles, currentProfile, isAdmin, defaultVehicleId, onCreate }) {
  const emptyForm = {
    vehicle_id: defaultVehicleId || vehicles[0]?.id || "",
    user_id: isAdmin ? "" : currentProfile?.id || "",
    project: "",
    destino: "",
    autorizado_por: "",
    start_date: todayISO(),
    end_date: todayISO(),
  };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm({ ...emptyForm, vehicle_id: defaultVehicleId || vehicles[0]?.id || "" });
      setError("");
    }
  }, [open, defaultVehicleId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.vehicle_id || !form.user_id || !form.start_date || !form.end_date) {
      setError("Completa vehículo, colaborador y fechas.");
      return;
    }
    if (form.end_date < form.start_date) {
      setError("La fecha fin no puede ser anterior a la fecha inicio.");
      return;
    }
    setSaving(true);
    try {
      await onCreate(form);
      onClose();
    } catch (err) {
      setError(err.message || "No se pudo crear la reserva.");
    } finally {
      setSaving(false);
    }
  };

  const eligibleProfiles = profiles.filter((p) => p.status === "activo");

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <Calendar size={16} className="text-teal-600" /> Nueva Reserva
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6">
          <Field label="Vehículo" required>
            <select className={inputCls} value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.brand} {v.model} — {v.plate}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Colaborador" required>
            {isAdmin ? (
              <select className={inputCls} value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })}>
                <option value="">Selecciona…</option>
                {eligibleProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <input className={`${inputCls} bg-slate-50`} value={currentProfile?.name || ""} disabled />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha inicio" required>
              <input type="date" className={inputCls} value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </Field>
            <Field label="Fecha fin" required>
              <input type="date" className={inputCls} value={form.end_date} min={form.start_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </Field>
          </div>

          <Field label="Proyecto / Cliente (Centro de Costos)">
            <input className={inputCls} value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} placeholder="Ej. Planta Escobedo" />
          </Field>
          <Field label="Destino">
            <input className={inputCls} value={form.destino} onChange={(e) => setForm({ ...form, destino: e.target.value })} placeholder="Ej. García, N.L." />
          </Field>
          <Field label="Autorizado por">
            <input className={inputCls} value={form.autorizado_por} onChange={(e) => setForm({ ...form, autorizado_por: e.target.value })} placeholder="Nombre del autorizador" />
          </Field>

          {error && <p className="text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg px-3 py-2 mb-4">{error}</p>}

          <button type="submit" disabled={saving} className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
            {saving && <Loader2 size={15} className="animate-spin" />}
            Confirmar reserva
          </button>
        </form>
      </div>
    </div>
  );
}
