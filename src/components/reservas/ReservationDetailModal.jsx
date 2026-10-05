import { useState, useEffect } from "react";
import { X, Calendar, Loader2, AlertTriangle, User, Car, Clock, MapPin, Briefcase, ShieldCheck, Trash2 } from "lucide-react";
import { Field, inputCls } from "../ui/formPrimitives";
import { fmtDate } from "../../lib/dateUtils";

const hhmm = (t) => (t ? t.slice(0, 5) : "");

/**
 * Admin  → formulario de edición completo + eliminación (con confirmación).
 * Resto  → ficha de solo lectura (en móvil es la forma de ver el
 *          detalle; en escritorio complementa el popover de hover).
 */
export default function ReservationDetailModal({ reservation, onClose, vehicles, profiles, isAdmin, blockedUsers = {}, onSave, onDelete }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!reservation) return;
    setForm({
      vehicle_id: reservation.vehicle_id || "",
      user_id: reservation.user_id || "",
      project: reservation.project || "",
      destino: reservation.destino || "",
      autorizado_por: reservation.autorizado_por || "",
      start_date: reservation.start_date,
      end_date: reservation.end_date,
      hora_salida_estimada: hhmm(reservation.hora_salida_estimada),
      hora_regreso_estimada: hhmm(reservation.hora_regreso_estimada),
    });
    setError("");
    setConfirmingDelete(false);
    setDeleting(false);
  }, [reservation]);

  if (!reservation || !form) return null;

  const vehicle = vehicles.find((v) => v.id === reservation.vehicle_id);

  // Solo se bloquea si el admin CAMBIA el colaborador a alguien con
  // viaje sin cerrar; editar la reserva del que ya la tenía no aplica
  // (el trigger de la BD tampoco lo evalúa si user_id no cambia).
  const blockedInfo = form.user_id !== reservation.user_id ? blockedUsers[form.user_id] : null;

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
    if (blockedInfo) {
      setError(`Este colaborador tiene un viaje sin cerrar en la unidad ${blockedInfo.plate}. Debe hacer check-in antes de asignarle otra reserva.`);
      return;
    }
    setSaving(true);
    try {
      await onSave(reservation.id, {
        vehicle_id: form.vehicle_id,
        user_id: form.user_id,
        project: form.project || null,
        destino: form.destino || null,
        autorizado_por: form.autorizado_por || null,
        start_date: form.start_date,
        end_date: form.end_date,
        hora_salida_estimada: form.hora_salida_estimada || null,
        hora_regreso_estimada: form.hora_regreso_estimada || null,
      });
      onClose();
    } catch (err) {
      setError(err.message || "No se pudo guardar la reserva.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setError("");
    setDeleting(true);
    try {
      await onDelete(reservation.id);
      onClose();
    } catch (err) {
      setError(err.message || "No se pudo eliminar la reserva.");
      setDeleting(false);
    }
  };

  // Eliminar la reserva NO cierra un viaje ya iniciado (la bitácora es independiente).
  const tripInProgress = blockedUsers[reservation.user_id]?.vehicleId === reservation.vehicle_id;
  const busy = saving || deleting;

  const shell = (title, icon, body) => (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            {icon} {title}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5">
            <X size={18} />
          </button>
        </div>
        {body}
      </div>
    </div>
  );

  // ---------- Vista de solo lectura ----------
  if (!isAdmin) {
    const rows = [
      [User, "Colaborador", reservation.profiles?.name],
      [Car, "Vehículo", vehicle ? `${vehicle.brand} ${vehicle.model} — ${vehicle.plate}` : null],
      [Calendar, "Fechas", reservation.start_date === reservation.end_date ? fmtDate(reservation.start_date) : `${fmtDate(reservation.start_date)} → ${fmtDate(reservation.end_date)}`],
      [Clock, "Horario estimado", reservation.hora_salida_estimada || reservation.hora_regreso_estimada ? `Sale ${hhmm(reservation.hora_salida_estimada) || "—"} · Regresa ${hhmm(reservation.hora_regreso_estimada) || "—"}` : null],
      [Briefcase, "Proyecto / Cliente", reservation.project],
      [MapPin, "Destino", reservation.destino],
      [ShieldCheck, "Autorizado por", reservation.autorizado_por],
    ];
    return shell(
      "Detalle de la reserva",
      <Calendar size={16} className="text-teal-600" />,
      <div className="p-6 space-y-3">
        {rows.map(([Icon, label, value]) => (
          <div key={label} className="flex items-start gap-3">
            <Icon size={15} className="text-slate-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400 uppercase">{label}</p>
              <p className="text-sm text-slate-800 break-words">{value || "—"}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ---------- Edición (admin) ----------
  const eligibleProfiles = profiles.filter((p) => p.status === "activo" || p.id === reservation.user_id);

  return shell(
    "Editar reserva",
    <Calendar size={16} className="text-teal-600" />,
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
        <select className={inputCls} value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })}>
          <option value="">Selecciona…</option>
          {eligibleProfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.id !== reservation.user_id && blockedUsers[p.id] ? ` — ⚠ viaje sin cerrar (${blockedUsers[p.id].plate})` : ""}
            </option>
          ))}
        </select>
      </Field>

      {blockedInfo && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2.5 mb-4 text-xs">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <p>
            Este colaborador tiene un viaje sin cerrar en la unidad <strong>{blockedInfo.plate}</strong>. No se le puede asignar la reserva hasta completar el check-in.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha inicio" required>
          <input type="date" className={inputCls} value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        </Field>
        <Field label="Fecha fin" required>
          <input type="date" className={inputCls} value={form.end_date} min={form.start_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
        </Field>
        <Field label="Hora salida estimada">
          <input type="time" className={inputCls} value={form.hora_salida_estimada} onChange={(e) => setForm({ ...form, hora_salida_estimada: e.target.value })} />
        </Field>
        <Field label="Hora regreso estimada">
          <input type="time" className={inputCls} value={form.hora_regreso_estimada} onChange={(e) => setForm({ ...form, hora_regreso_estimada: e.target.value })} />
        </Field>
      </div>

      <Field label="Proyecto / Cliente (Centro de Costos)">
        <input className={inputCls} value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} />
      </Field>
      <Field label="Destino">
        <input className={inputCls} value={form.destino} onChange={(e) => setForm({ ...form, destino: e.target.value })} />
      </Field>
      <Field label="Autorizado por">
        <input className={inputCls} value={form.autorizado_por} onChange={(e) => setForm({ ...form, autorizado_por: e.target.value })} />
      </Field>

      {error && <p className="text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg px-3 py-2 mb-4">{error}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={onClose} disabled={busy} className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={busy || !!blockedInfo}
          className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          Guardar cambios
        </button>
      </div>

      {onDelete && (
        <div className="mt-5 pt-5 border-t border-slate-100">
          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => {
                setError("");
                setConfirmingDelete(true);
              }}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-rose-600 border border-rose-200 hover:bg-rose-50 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <Trash2 size={15} /> Eliminar reserva
            </button>
          ) : (
            <div role="alertdialog" aria-labelledby="del-title" className="rounded-xl border border-rose-200 bg-rose-50/60 p-4">
              <p id="del-title" className="text-sm font-semibold text-rose-800">
                ¿Eliminar esta reserva?
              </p>
              <p className="mt-1 text-xs leading-relaxed text-rose-700">
                Se eliminará la reserva de <strong>{reservation.profiles?.name || "este colaborador"}</strong>
                {vehicle ? <> en <strong>{vehicle.plate}</strong></> : null}{" "}
                {reservation.start_date === reservation.end_date
                  ? <>del <strong>{fmtDate(reservation.start_date)}</strong></>
                  : <>del <strong>{fmtDate(reservation.start_date)}</strong> al <strong>{fmtDate(reservation.end_date)}</strong></>}
                . Esta acción no se puede deshacer.
              </p>
              {tripInProgress && (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  Este colaborador tiene un viaje en curso con esta unidad. Eliminar la reserva no lo cierra: el check-in sigue pendiente.
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                  className="flex-1 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 rounded-lg py-2 text-sm font-semibold disabled:opacity-60"
                >
                  Conservar
                </button>
                <button
                  type="button"
                  onClick={remove}
                  disabled={deleting}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait"
                >
                  {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  {deleting ? "Eliminando…" : "Sí, eliminar"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
