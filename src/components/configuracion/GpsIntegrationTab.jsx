import { useState, useEffect } from "react";
import { Save, Eye, EyeOff, Loader2, MapPin, AlertTriangle, ExternalLink } from "lucide-react";
import { useGpsIntegration } from "../../hooks/useGpsIntegration";
import { Field, inputCls } from "../ui/formPrimitives";

export default function GpsIntegrationTab({ toast }) {
  const { settings, loading, updateSettings } = useGpsIntegration();
  const [form, setForm] = useState(settings);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(settings), [settings]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings(form);
      toast("Configuración de GPS actualizada.");
    } catch (err) {
      toast(err.message || "No se pudo guardar.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
        <Loader2 size={18} className="animate-spin" /> Cargando…
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="font-semibold text-slate-800 text-sm mb-1 flex items-center gap-2">
        <MapPin size={15} className="text-teal-600" /> Integración con portal de GPS
      </h3>
      <p className="text-xs text-slate-500 mb-4">
        Enlaza el portal de rastreo satelital de tu proveedor (ej. 4Track) para acceder a él desde DrivePulse.
      </p>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-[11px] text-amber-700 flex items-start gap-2 mb-5">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <span>
          Esto guarda usuario y contraseña de un servicio externo dentro de la base de datos, protegidos para que
          solo el administrador pueda leerlos. DrivePulse no puede iniciar sesión automáticamente en el portal por
          ti (los navegadores lo bloquean por seguridad) — esta pantalla solo te da acceso rápido y un botón para
          copiar tus credenciales al portapapeles.
        </span>
      </div>

      <form onSubmit={save}>
        <label className="flex items-center gap-2 text-sm text-slate-700 mb-4">
          <input type="checkbox" className="accent-teal-600" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
          Habilitar acceso a GPS desde el menú
        </label>

        <Field label="URL del portal">
          <input className={inputCls} value={form.portal_url || ""} onChange={(e) => setForm({ ...form, portal_url: e.target.value })} placeholder="https://gps.4track.mx/" />
        </Field>
        <Field label="Usuario">
          <input className={inputCls} value={form.username || ""} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="off" />
        </Field>
        <Field label="Contraseña">
          <div className="relative">
            <input
              className={`${inputCls} pr-9`}
              type={showPassword ? "text" : "password"}
              value={form.password || ""}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
            />
            <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>

        <div className="flex gap-2 mt-2">
          <button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-5 py-2.5 text-sm font-semibold flex items-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={14} />}
            Guardar cambios
          </button>
          {form.portal_url && (
            <a
              href={form.portal_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50"
            >
              <ExternalLink size={13} /> Probar portal
            </a>
          )}
        </div>
      </form>
    </div>
  );
}
