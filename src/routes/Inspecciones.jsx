import { useState, useEffect } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { useVehicles } from "../hooks/useVehicles";
import { useInspections } from "../hooks/useInspections";
import { useToasts, ToastStack } from "../components/ui/Toast";
import { Field, inputCls } from "../components/ui/formPrimitives";

const DOC_ITEMS = [
  { key: "circulacion", label: "Tarjeta de Circulación" },
  { key: "seguro", label: "Seguro Vigente" },
  { key: "verificacion", label: "Verificación Vehicular" },
  { key: "licencia", label: "Licencia del Conductor Asociado" },
];

const SAFETY_EQUIPMENT = ["Llanta de refacción", "Gato hidráulico", "Llave de cruz", "Extintor vigente", "Reflejantes", "Cables pasa-corriente", "Botiquín"];

const CONDITION_MATRIX_ITEMS = [
  "Carrocería y pintura", "Llantas y rines", "Luces delanteras/traseras",
  "Motor y niveles de fluidos", "Frenos", "Suspensión", "Interiores y tapicería",
  "Cinturones de seguridad", "Aire acondicionado", "Sistema eléctrico",
];

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Inspecciones() {
  const { vehicles, loading: loadingVehicles } = useVehicles();
  const { inspections, loading: loadingInspections, createInspection } = useInspections();
  const { toasts, toast, remove } = useToasts();

  const [vehicleId, setVehicleId] = useState("");
  const [docs, setDocs] = useState(Object.fromEntries(DOC_ITEMS.map((d) => [d.key, true])));
  const [equipo, setEquipo] = useState(Object.fromEntries(SAFETY_EQUIPMENT.map((e) => [e, true])));
  const [matriz, setMatriz] = useState(Object.fromEntries(CONDITION_MATRIX_ITEMS.map((i) => [i, "Bueno"])));
  const [observaciones, setObservaciones] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!vehicleId && vehicles.length > 0) setVehicleId(vehicles[0].id);
  }, [vehicles, vehicleId]);

  const vehicle = vehicles.find((v) => v.id === vehicleId);

  const submit = async (e) => {
    e.preventDefault();
    if (!vehicleId) return toast("Selecciona un vehículo.", "error");
    setSaving(true);
    try {
      await createInspection({
        vehicle_id: vehicleId,
        docs,
        equipo,
        matriz,
        observaciones,
        km: vehicle?.km ?? null,
      });
      toast("Inspección mensual registrada correctamente.");
      setObservaciones("");
    } catch (err) {
      toast(err.message || "No se pudo registrar la inspección.", "error");
    } finally {
      setSaving(false);
    }
  };

  const loading = loadingVehicles || loadingInspections;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24 text-slate-400 gap-2">
        <Loader2 size={18} className="animate-spin" /> Cargando inspecciones…
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 grid xl:grid-cols-[1fr_360px] gap-5">
      <ToastStack toasts={toasts} remove={remove} />

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Inspección Mensual y Auditoría</h1>
        <p className="text-sm text-slate-500 mb-5">Verificación formal de Recursos Humanos.</p>

        <form onSubmit={submit}>
          <Field label="Vehículo a inspeccionar" required>
            <select className={inputCls} value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.brand} {v.model} — {v.plate}</option>
              ))}
            </select>
          </Field>

          {vehicle && (
            <div className="flex gap-4 text-xs text-slate-500 mb-5 bg-slate-50 rounded-lg p-3">
              <span>Placas: <strong className="text-slate-700 font-mono">{vehicle.plate}</strong></span>
              <span>KM actual: <strong className="text-slate-700">{vehicle.km.toLocaleString()}</strong></span>
            </div>
          )}

          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Verificación de documentos</p>
          <div className="grid grid-cols-2 gap-2 mb-5">
            {DOC_ITEMS.map((d) => (
              <label key={d.key} className="flex items-center gap-2 text-xs text-slate-600 border border-slate-100 rounded-lg px-3 py-2">
                <input type="checkbox" className="accent-teal-600" checked={docs[d.key] ?? true} onChange={(e) => setDocs({ ...docs, [d.key]: e.target.checked })} />
                {d.label}
              </label>
            ))}
          </div>

          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Equipo de seguridad</p>
          <div className="grid grid-cols-2 gap-2 mb-5">
            {SAFETY_EQUIPMENT.map((eq) => (
              <label key={eq} className="flex items-center gap-2 text-xs text-slate-600 border border-slate-100 rounded-lg px-3 py-2">
                <input type="checkbox" className="accent-teal-600" checked={equipo[eq]} onChange={(e) => setEquipo({ ...equipo, [eq]: e.target.checked })} />
                {eq}
              </label>
            ))}
          </div>

          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Matriz de condición general</p>
          <div className="border border-slate-100 rounded-xl overflow-hidden mb-5">
            {CONDITION_MATRIX_ITEMS.map((item, i) => (
              <div key={item} className={`flex items-center justify-between px-3 py-2 ${i % 2 ? "bg-white" : "bg-slate-50/60"}`}>
                <span className="text-xs text-slate-600">{item}</span>
                <div className="flex gap-1">
                  {["Bueno", "Regular", "Malo"].map((v) => (
                    <button
                      type="button"
                      key={v}
                      onClick={() => setMatriz({ ...matriz, [item]: v })}
                      className={`text-[10px] font-semibold px-2 py-1 rounded-md border transition ${
                        matriz[item] === v
                          ? v === "Bueno" ? "bg-emerald-500 text-white border-emerald-500" : v === "Regular" ? "bg-amber-500 text-white border-amber-500" : "bg-rose-500 text-white border-rose-500"
                          : "border-slate-200 text-slate-400"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Field label="Observaciones generales">
            <textarea className={inputCls} rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </Field>

          <button type="submit" disabled={saving} className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
            Registrar inspección
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 h-fit">
        <h3 className="font-semibold text-slate-800 text-sm mb-4">Historial reciente</h3>
        <div className="space-y-3">
          {inspections.slice(0, 8).map((insp) => {
            const v = vehicles.find((x) => x.id === insp.vehicle_id);
            const malos = Object.values(insp.matriz || {}).filter((x) => x === "Malo").length;
            return (
              <div key={insp.id} className="border border-slate-100 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-slate-700">{v?.plate || "—"}</p>
                  <span className="text-[10px] text-slate-400">{fmtDate(insp.created_at)}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {malos > 0 ? `${malos} punto(s) en condición Mala` : "Condición general adecuada"}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Por {insp.profiles?.name || "—"}</p>
              </div>
            );
          })}
          {inspections.length === 0 && <p className="text-xs text-slate-400">Aún no hay inspecciones registradas.</p>}
        </div>
      </div>
    </div>
  );
}
