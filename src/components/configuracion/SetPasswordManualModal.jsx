import { useState } from "react";
import { X, KeyRound, Loader2, Copy, Check } from "lucide-react";
import { setUserPassword } from "../../lib/supabaseClient";
import { Field, inputCls, PasswordStrength } from "../ui/formPrimitives";

function randomPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let out = "";
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function SetPasswordManualModal({ open, onClose, user, toast }) {
  const [password, setPassword] = useState(randomPassword());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  if (!open || !user) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Mínimo 8 caracteres.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await setUserPassword(user.id, password);
      toast(`Contraseña asignada a ${user.name}. Compártesela directamente (WhatsApp, en persona, etc.) — no se envía correo.`);
      onClose();
    } catch (err) {
      setError(err.message || "No se pudo asignar la contraseña.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <KeyRound size={16} className="text-teal-600" /> Asignar contraseña manual
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6">
          <p className="text-xs text-slate-500 mb-4">
            Esto activa la cuenta de <strong>{user.name}</strong> ({user.email}) sin depender del envío de correo.
            Tú le compartes la contraseña directamente por el medio que prefieras.
          </p>

          <Field label="Contraseña" required>
            <div className="relative">
              <input className={`${inputCls} pr-16`} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
              <button type="button" onClick={copy} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 text-[11px] font-semibold flex items-center gap-1">
                {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              </button>
            </div>
            <PasswordStrength value={password} />
            <button type="button" onClick={() => setPassword(randomPassword())} className="text-[11px] text-teal-600 hover:underline mt-1">
              Generar otra
            </button>
          </Field>

          {error && <p className="text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg px-3 py-2 mb-4">{error}</p>}

          <button type="submit" disabled={saving} className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
            {saving && <Loader2 size={15} className="animate-spin" />}
            Asignar y activar cuenta
          </button>
        </form>
      </div>
    </div>
  );
}
