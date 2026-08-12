import { useState } from "react";
import { X, PenLine, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { Field, inputCls } from "../ui/formPrimitives";

/**
 * Un solo modal para las dos acciones — nunca tocan `snapshot` ni
 * `hash` del registro original, solo agregan metadatos de quién,
 * cuándo y por qué (ver 0015_auditoria_correccion_con_rastro.sql).
 */
export default function AuditActionModal({ open, onClose, mode, record, toast, onDone }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open || !record) return null;

  const isHide = mode === "hide";

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      setError(isHide ? "Indica el motivo para ocultar este registro." : "Escribe la nota de corrección.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { error } = await supabase.rpc(isHide ? "admin_hide_audit_log" : "admin_annotate_audit_log", isHide ? { p_log_id: record.id, p_reason: text.trim() } : { p_log_id: record.id, p_note: text.trim() });
      if (error) throw error;
      toast(isHide ? "Registro ocultado. El dato original se conserva intacto." : "Corrección anotada. El registro original no se modificó.");
      onDone();
      onClose();
      setText("");
    } catch (err) {
      setError(err.message || "No se pudo completar la acción.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            {isHide ? <EyeOff size={16} className="text-amber-600" /> : <PenLine size={16} className="text-teal-600" />}
            {isHide ? "Ocultar registro" : "Anotar corrección"}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6">
          <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 mb-4">
            {isHide
              ? "El registro deja de mostrarse en la lista principal, pero NO se borra — sigue existiendo con su hash original intacto, y puedes restaurarlo cuando quieras."
              : "Esto agrega una nota visible junto al registro. El snapshot y el hash originales nunca se modifican."}
          </p>

          <Field label={isHide ? "Motivo" : "Nota de corrección"} required>
            <textarea
              className={inputCls}
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={isHide ? "Ej. Registro de prueba, no corresponde a un uso real." : "Ej. El KM capturado fue un error de dedo, el correcto es..."}
              autoFocus
            />
          </Field>

          {error && <p className="text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg px-3 py-2 mb-4">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className={`w-full text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 ${
              isHide ? "bg-amber-600 hover:bg-amber-700" : "bg-teal-600 hover:bg-teal-700"
            }`}
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {isHide ? "Ocultar registro" : "Guardar corrección"}
          </button>
        </form>
      </div>
    </div>
  );
}
