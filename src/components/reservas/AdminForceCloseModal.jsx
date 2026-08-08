import { useState } from "react";
import { X, AlertTriangle, Loader2, User } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { Field, inputCls } from "../ui/formPrimitives";
import { fmtDate } from "../../lib/dateUtils";

export default function AdminForceCloseModal({ open, onClose, openBitacora, vehicle, toast, onClosed }) {
  const [kmFinal, setKmFinal] = useState("");
  const [nota, setNota] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open || !openBitacora) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!nota.trim()) {
      setError("Explica brevemente por qué se está cerrando de forma administrativa.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { error } = await supabase.rpc("admin_force_close_bitacora", {
        p_bitacora_id: openBitacora.id,
        p_km_final: kmFinal ? Number(kmFinal) : null,
        p_nota_admin: nota.trim(),
      });
      if (error) throw error;
      toast(`Viaje cerrado administrativamente. ${vehicle?.identifier || vehicle?.plate} vuelve a estar disponible.`);
      onClosed();
      onClose();
    } catch (err) {
      setError(err.message || "No se pudo cerrar el viaje.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <AlertTriangle size={16} className="text-amber-500" /> Cerrar viaje administrativamente
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-[11px] text-amber-700 mb-4">
            Esto cierra el viaje sin firma ni fotos del conductor. Úsalo solo cuando el check-in normal no se pudo
            completar por algún error. Queda registrado en la Caja Negra como un cierre administrativo, distinto a
            un check-in real — nunca se sobrescribe quién sacó el vehículo.
          </div>

          <div className="bg-slate-50 rounded-lg p-3 mb-4 text-xs text-slate-600 space-y-1">
            <p className="flex items-center gap-1.5 font-semibold"><User size={12} /> Salida registrada por: {openBitacora.profiles?.name || "—"}</p>
            <p>Fecha de salida: {fmtDate(openBitacora.created_at?.slice(0, 10))}</p>
            <p>Destino: {openBitacora.destino || "—"} · Proyecto: {openBitacora.proyecto || "—"}</p>
            <p>KM inicial: <strong>{openBitacora.km_inicial}</strong></p>
          </div>

          <Field label="KM final (si lo sabes)">
            <input type="number" className={inputCls} value={kmFinal} onChange={(e) => setKmFinal(e.target.value)} min={openBitacora.km_inicial} placeholder="Opcional" />
          </Field>

          <Field label="Motivo del cierre administrativo" required>
            <textarea
              className={inputCls}
              rows={3}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej. El colaborador ya no está en la empresa y nunca registró su regreso."
              required
            />
          </Field>

          {error && <p className="text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg px-3 py-2 mb-4">{error}</p>}

          <button type="submit" disabled={saving} className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
            {saving && <Loader2 size={15} className="animate-spin" />}
            Cerrar viaje y liberar vehículo
          </button>
        </form>
      </div>
    </div>
  );
}
