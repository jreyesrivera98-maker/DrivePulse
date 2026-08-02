import { useState } from "react";
import { X, UserPlus, Loader2 } from "lucide-react";
import { inviteUser } from "../../lib/supabaseClient";
import { Field, inputCls } from "../ui/formPrimitives";

const emptyForm = { name: "", email: "", role: "trabajador", area: "" };

export default function InviteUserModal({ open, onClose, onInvited }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await inviteUser(form);
      onInvited(form.email);
      setForm(emptyForm);
      onClose();
    } catch (err) {
      setError(err.message || "No se pudo enviar la invitación.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <UserPlus size={16} className="text-teal-600" /> Invitar colaborador
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6">
          <Field label="Nombre completo" required>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Correo corporativo" required>
            <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </Field>
          <Field label="Área">
            <input className={inputCls} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Ej. Operaciones" />
          </Field>
          <Field label="Rol" required>
            <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="trabajador">Trabajador / Colaborador</option>
              <option value="administrador">Administrador / RH</option>
            </select>
          </Field>

          {error && <p className="text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg px-3 py-2 mb-4">{error}</p>}

          <button type="submit" disabled={saving} className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold mt-2 flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={14} />}
            Enviar invitación
          </button>
        </form>
      </div>
    </div>
  );
}
