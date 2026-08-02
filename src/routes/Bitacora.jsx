import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Save, PenTool, Loader2, Wifi, WifiOff } from "lucide-react";
import { supabase, uploadFile, BUCKETS } from "../lib/supabaseClient";
import { useVehicles } from "../hooks/useVehicles";
import { useSelectedVehicle } from "../contexts/SelectedVehicleContext";
import { useToasts, ToastStack } from "../components/ui/Toast";
import { Field, inputCls } from "../components/ui/formPrimitives";
import DamageMap from "../components/bitacora/DamageMap";
import SignaturePad from "../components/bitacora/SignaturePad";
import VoucherOCR from "../components/bitacora/VoucherOCR";
import HistoricoBitacoras from "../components/bitacora/HistoricoBitacoras";
import Badge from "../components/ui/Badge";

const FUEL_LEVELS = ["Vacío", "1/4", "1/2", "3/4", "Lleno"];

/** Convierte el dataURL del canvas de firma en un Blob subible a Storage. */
async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return res.blob();
}

export default function Bitacora({ profile }) {
  const location = useLocation();
  const { vehicles, loading: loadingVehicles } = useVehicles();
  const { toasts, toast, remove } = useToasts();
  const isAdmin = profile?.role === "administrador";

  const [tipo, setTipo] = useState("salida");
  const [vehicleId, setVehicleId] = useState(location.state?.vehicleId || "");
  const [proyecto, setProyecto] = useState("");
  const [destino, setDestino] = useState("");
  const [autorizadoPor, setAutorizadoPor] = useState("");
  const [kmInicial, setKmInicial] = useState("");
  const [kmFinal, setKmFinal] = useState("");
  const [combustibleSalida, setCombustibleSalida] = useState("Lleno");
  const [combustibleRegreso, setCombustibleRegreso] = useState("Lleno");
  const [limpieza, setLimpieza] = useState(true);
  const [incidencias, setIncidencias] = useState("");
  const [danios, setDanios] = useState([]);
  const [firma, setFirma] = useState(null);
  const [conformidad, setConformidad] = useState(false);
  const [voucher, setVoucher] = useState({ attached: false });
  const [saving, setSaving] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    if (!vehicleId && vehicles.length > 0) setVehicleId(vehicles[0].id);
  }, [vehicles, vehicleId]);

  useEffect(() => {
    if (!location.state?.vehicleId) return;
    const v = vehicles.find((x) => x.id === location.state.vehicleId);
    if (v) setTipo(v.status === "en_uso" ? "regreso" : "salida");
  }, [vehicles, location.state]);

  // Si el usuario toca otra unidad en el Panel de Flotilla mientras
  // está en esta página, el formulario la adopta automáticamente.
  const { selectedVehicleId } = useSelectedVehicle();
  useEffect(() => {
    if (selectedVehicleId) setVehicleId(selectedVehicleId);
  }, [selectedVehicleId]);

  useEffect(() => {
    const set = () => setOnline(navigator.onLine);
    window.addEventListener("online", set);
    window.addEventListener("offline", set);
    return () => {
      window.removeEventListener("online", set);
      window.removeEventListener("offline", set);
    };
  }, []);

  const vehicle = vehicles.find((v) => v.id === vehicleId);

  const resetForm = () => {
    setDanios([]);
    setFirma(null);
    setConformidad(false);
    setIncidencias("");
    setVoucher({ attached: false });
    setKmInicial("");
    setKmFinal("");
  };

  const captureGps = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 4000 }
      );
    });

  const submit = async (e) => {
    e.preventDefault();
    if (!online) {
      toast("Sin conexión: no se puede enviar la bitácora en este momento. Vuelve a intentar al recuperar señal.", "warn");
      return;
    }
    if (!conformidad) return toast("Debes aceptar la declaración de conformidad.", "error");
    if (!firma) return toast("Captura tu firma digital antes de continuar.", "error");
    if (!vehicleId) return toast("Selecciona un vehículo.", "error");

    setSaving(true);
    try {
      // 1) Firma → Storage
      const firmaBlob = await dataUrlToBlob(firma);
      const firmaUrl = await uploadFile(BUCKETS.signatures, `${vehicleId}/${Date.now()}_firma.png`, firmaBlob);

      // 2) GPS (coordenadas del dispositivo)
      const gps = await captureGps();

      // 3) Enviar todo en una sola transacción atómica del lado del servidor.
      const { data, error } = await supabase.rpc("submit_bitacora", {
        p_vehicle_id: vehicleId,
        p_tipo: tipo,
        p_proyecto: proyecto,
        p_destino: destino,
        p_autorizado_por: autorizadoPor,
        p_km_inicial: Number(kmInicial) || vehicle?.km || 0,
        p_km_final: tipo === "regreso" ? Number(kmFinal) || null : null,
        p_combustible_salida: combustibleSalida,
        p_combustible_regreso: tipo === "regreso" ? combustibleRegreso : null,
        p_limpieza: limpieza,
        p_incidencias: incidencias,
        p_danios: danios,
        p_firma_url: firmaUrl,
        p_gps_lat: gps?.lat ?? null,
        p_gps_lng: gps?.lng ?? null,
        p_voucher: voucher.attached ? voucher : null,
      });

      if (error) throw error;

      toast(`Bitácora registrada y auditada correctamente (hash ${data.hash.slice(0, 10)}…).`);
      resetForm();
    } catch (err) {
      toast(err.message || "No se pudo guardar la bitácora.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loadingVehicles) {
    return (
      <div className="flex items-center justify-center h-full py-24 text-slate-400 gap-2">
        <Loader2 size={18} className="animate-spin" /> Cargando vehículos…
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <ToastStack toasts={toasts} remove={remove} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bitácora Diaria de Uso</h1>
          <p className="text-sm text-slate-500">Checklist de check-in / check-out del vehículo.</p>
        </div>
        <span className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border ${online ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-amber-600 bg-amber-50 border-amber-200"}`}>
          {online ? <Wifi size={12} /> : <WifiOff size={12} />} {online ? "En línea" : "Sin conexión"}
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex gap-2 mb-5">
          <button onClick={() => setTipo("salida")} className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${tipo === "salida" ? "bg-dp-black text-white" : "bg-slate-100 text-slate-500"}`}>
            Check-out / Salida
          </button>
          <button onClick={() => setTipo("regreso")} className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${tipo === "regreso" ? "bg-dp-black text-white" : "bg-slate-100 text-slate-500"}`}>
            Check-in / Regreso
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="grid md:grid-cols-2 gap-x-4">
            <Field label="Vehículo" required>
              <select className={inputCls} value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.brand} {v.model} — {v.plate}</option>
                ))}
              </select>
              {vehicle && <div className="mt-1.5"><Badge status={vehicle.status} size="sm" /></div>}
            </Field>
            <Field label="Proyecto / Cliente (Centro de Costos)" required>
              <input className={inputCls} value={proyecto} onChange={(e) => setProyecto(e.target.value)} placeholder="Ej. Planta Apodaca" required />
            </Field>
            <Field label="Destino" required>
              <input className={inputCls} value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Ej. Apodaca, N.L." required />
            </Field>
            <Field label="Autorizado por" required>
              <input className={inputCls} value={autorizadoPor} onChange={(e) => setAutorizadoPor(e.target.value)} placeholder="Nombre del autorizador" required />
            </Field>
            <Field label="KM inicial" required>
              <input type="number" className={inputCls} value={kmInicial} onChange={(e) => setKmInicial(e.target.value)} placeholder={String(vehicle?.km || "")} required />
            </Field>
            {tipo === "regreso" && (
              <Field label="KM final" required>
                <input type="number" className={inputCls} value={kmFinal} onChange={(e) => setKmFinal(e.target.value)} required />
              </Field>
            )}
            <Field label="Combustible al salir">
              <select className={inputCls} value={combustibleSalida} onChange={(e) => setCombustibleSalida(e.target.value)}>
                {FUEL_LEVELS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </Field>
            {tipo === "regreso" && (
              <Field label="Combustible al regresar">
                <select className={inputCls} value={combustibleRegreso} onChange={(e) => setCombustibleRegreso(e.target.value)}>
                  {FUEL_LEVELS.map((f) => <option key={f}>{f}</option>)}
                </select>
              </Field>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600 mb-4">
            <input type="checkbox" className="accent-teal-600" checked={limpieza} onChange={(e) => setLimpieza(e.target.checked)} />
            El vehículo se entrega/recibe limpio por dentro y por fuera.
          </label>

          <Field label="Incidencias / observaciones">
            <textarea className={inputCls} rows={2} value={incidencias} onChange={(e) => setIncidencias(e.target.value)} placeholder="Describe cualquier incidencia relevante..." />
          </Field>

          {vehicleId && (
            <>
              <div className="mb-5">
                <p className="text-xs font-semibold text-slate-600 mb-2">Mapa de desperfectos</p>
                <DamageMap damages={danios} onChange={setDanios} vehicleId={vehicleId} toast={toast} />
              </div>

              <div className="mb-5">
                <VoucherOCR voucher={voucher} setVoucher={setVoucher} vehicleId={vehicleId} toast={toast} />
              </div>
            </>
          )}

          <div className="mb-5">
            <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
              <PenTool size={14} className="text-teal-600" /> Firma digital
            </p>
            <SignaturePad onChange={setFirma} />
          </div>

          <label className="flex items-start gap-2 text-xs text-slate-600 mb-5 bg-slate-50 rounded-lg p-3 border border-slate-100">
            <input type="checkbox" className="accent-teal-600 mt-0.5" checked={conformidad} onChange={(e) => setConformidad(e.target.checked)} />
            Declaro que la información capturada es verídica y refleja el estado real del vehículo al momento del registro.
            Entiendo que este registro quedará almacenado de forma inmutable para fines de auditoría.
          </label>

          <button type="submit" disabled={saving} className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? "Guardando…" : "Guardar bitácora"}
          </button>
        </form>
      </div>

      {isAdmin && <HistoricoBitacoras vehicles={vehicles} toast={toast} />}
    </div>
  );
}
