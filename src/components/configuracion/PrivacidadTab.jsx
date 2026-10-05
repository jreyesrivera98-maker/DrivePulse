import { useEffect, useState } from "react";
import { AlertTriangle, Check, ExternalLink, Loader2, Save } from "lucide-react";
import { Field, inputCls } from "../ui/formPrimitives";
import { countMissingLegal } from "../../hooks/useLegalSettings";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const toForm = (legal) => ({
  responsable: legal.responsable ?? "",
  domicilio: legal.domicilio ?? "",
  correoPrivacidad: legal.correoPrivacidad ?? "",
  plazoConservacion: legal.plazoConservacion ?? "",
});

const trimmed = (f) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim()]));

const Hint = ({ children }) => <p className="mt-1.5 text-[11px] leading-snug text-slate-400">{children}</p>;

/**
 * Configuración › Privacidad: datos del responsable que se muestran en el
 * Aviso de privacidad de la organización. Solo administradores (lo impone
 * el RPC save_legal_settings; esta pestaña vive en una ruta de administrador).
 */
export default function PrivacidadTab({ legalSettings, toast }) {
  const { legal, loading, save } = legalSettings;
  const [form, setForm] = useState(() => toForm(legal));
  const [saving, setSaving] = useState(false);
  const [emailError, setEmailError] = useState("");

  useEffect(() => setForm(toForm(legal)), [legal]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
        <Loader2 size={16} className="animate-spin" /> Cargando…
      </div>
    );
  }

  const missing = countMissingLegal(legal);
  const dirty = JSON.stringify(trimmed(form)) !== JSON.stringify(trimmed(toForm(legal)));
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (k === "correoPrivacidad") setEmailError("");
  };

  const submit = async (e) => {
    e.preventDefault();
    const values = trimmed(form);
    if (values.correoPrivacidad && !EMAIL_RE.test(values.correoPrivacidad)) {
      setEmailError("Escribe un correo válido, por ejemplo privacidad@tuempresa.com.");
      return;
    }
    setSaving(true);
    try {
      await save(values);
      toast("Datos del aviso de privacidad guardados.");
    } catch (err) {
      toast(err.message || "No se pudieron guardar los datos.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-800 text-sm">Datos del responsable del aviso de privacidad</h3>
          <p className="mt-1 max-w-[62ch] text-xs leading-relaxed text-slate-500">
            Aparecen en el aviso de privacidad que consultan tus colaboradores. Si dejas un dato vacío, el aviso usa un texto genérico (por ejemplo,
            “tu administrador”). Pide a tu asesor legal que revise el contenido completo del aviso.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {missing === 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-[11px] font-semibold text-teal-700">
              <Check size={12} /> Completo
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-800">
              <AlertTriangle size={12} /> {missing === 1 ? "Falta 1 dato" : `Faltan ${missing} datos`}
            </span>
          )}
          <a
            href="/privacidad"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:underline"
          >
            Ver aviso <ExternalLink size={11} />
          </a>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-x-5">
        <div className="md:col-span-2">
          <Field label="Responsable (razón social)">
            <input className={inputCls} maxLength={200} value={form.responsable} onChange={set("responsable")} placeholder="Razón social de la empresa" autoComplete="off" />
          </Field>
          <Hint>La persona física o moral que decide sobre el tratamiento de los datos personales.</Hint>
        </div>

        <div className="md:col-span-2 mt-4">
          <Field label="Domicilio del responsable">
            <textarea className={`${inputCls} resize-none`} rows={2} maxLength={500} value={form.domicilio} onChange={set("domicilio")} placeholder="Calle, número, colonia, ciudad, estado y C.P." />
          </Field>
        </div>

        <div className="mt-1">
          <Field label="Correo para solicitudes de privacidad">
            <input
              type="email"
              className={`${inputCls} ${emailError ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/30" : ""}`}
              maxLength={200}
              value={form.correoPrivacidad}
              onChange={set("correoPrivacidad")}
              placeholder="privacidad@tuempresa.com"
              aria-invalid={!!emailError}
              aria-describedby={emailError ? "legal-email-error" : undefined}
            />
          </Field>
          {emailError ? (
            <p id="legal-email-error" role="alert" className="-mt-2 text-[11px] text-rose-600">
              {emailError}
            </p>
          ) : (
            <Hint>Aquí llegan las solicitudes de acceso, rectificación, cancelación y oposición (ARCO).</Hint>
          )}
        </div>

        <div className="mt-1">
          <Field label="Plazo de conservación">
            <input className={inputCls} maxLength={120} value={form.plazoConservacion} onChange={set("plazoConservacion")} placeholder="Ej. 5 años" autoComplete="off" />
          </Field>
          <Hint>Tiempo que conservas los datos después de que termina la relación con el colaborador.</Hint>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
        <button
          type="submit"
          disabled={saving || !dirty}
          className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-5 py-2.5 text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={14} />}
          Guardar cambios
        </button>
        {legal.updatedAt && (
          <span className="text-[11px] text-slate-400">
            Última actualización: {new Date(legal.updatedAt).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        )}
      </div>
    </form>
  );
}
