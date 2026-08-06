import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Save, PenTool, Loader2, Wifi, WifiOff, LogOut, LogIn, User } from "lucide-react";
import { supabase, uploadFile, BUCKETS } from "../lib/supabaseClient";
import { useVehicles } from "../hooks/useVehicles";
import { useOpenBitacora } from "../hooks/useOpenBitacora";
import { useSelectedVehicle } from "../contexts/SelectedVehicleContext";
import { useToasts, ToastStack } from "../components/ui/Toast";
import { Field, inputCls } from "../components/ui/formPrimitives";
import DamageMap from "../components/bitacora/DamageMap";
import IncidenciaFotos from "../components/bitacora/IncidenciaFotos";
import SignaturePad from "../components/bitacora/SignaturePad";
import VoucherOCR from "../components/bitacora/VoucherOCR";
import HistoricoBitacoras from "../components/bitacora/HistoricoBitacoras";
import Badge from "../components/ui/Badge";
import { fmtDate } from "../lib/dateUtils";

const FUEL_LEVELS = ["Vacío", "1/4", "1/2", "3/4", "Lleno"];

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return res.blob();
}

function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const set = () => setOnline(navigator.onLine);
    window.addEventListener("online", set);
    window.addEventListener("offline", set);
    return () => {
      window.removeEventListener("online", set);
      window.removeEventListener("offline", set);
    };
  }, []);
  return online;
}

function captureGps() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 4000 }
    );
  });
}

export default function Bitacora({ profile }) {
  const location = useLocation();
  const { vehicles, loading: loadingVehicles } = useVehicles();
  const { toasts, toast, remove } = useToasts();
  const isAdmin = profile?.role === "administrador";
  const online = useOnlineStatus();

  const [vehicleId, setVehicleId] = useState(location.state?.vehicleId || "");
  const { selectedVehicleId } = useSelectedVehicle();

  useEffect(() => {
    if (!vehicleId && vehicles.length > 0) setVehicleId(vehicles[0].id);
  }, [vehicles, vehicleId]);

  // Si el usuario toca otra unidad en el Panel de Flotilla / carrusel
  // móvil mientras está en esta página, el formulario la adopta.
  useEffect(() => {
    if (selectedVehicleId) setVehicleId(selectedVehicleId);
  }, [selectedVehicleId]);

  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const { openBitacora, loading: loadingOpen, refetch: refetchOpen } = useOpenBitacora(vehicleId);

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
          <p className="text-sm text-slate-500">Cada viaje se abre con el check-out y se cierra con el check-in.</p>
        </div>
        <span className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border ${online ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-amber-600 bg-amber-50 border-amber-200"}`}>
          {online ? <Wifi size={12} /> : <WifiOff size={12} />} {online ? "En línea" : "Sin conexión"}
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <Field label="Vehículo" required>
          <select className={inputCls} value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.brand} {v.model} — {v.identifier || v.plate}</option>
            ))}
          </select>
          {vehicle && <div className="mt-1.5"><Badge status={vehicle.status} size="sm" /></div>}
        </Field>

        {loadingOpen ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-6 justify-center">
            <Loader2 size={16} className="animate-spin" /> Verificando estado del vehículo…
          </div>
        ) : openBitacora ? (
          <CheckInForm
            key={openBitacora.id}
            vehicle={vehicle}
            openBitacora={openBitacora}
            online={online}
            toast={toast}
            onDone={() => {
              refetchOpen();
            }}
          />
        ) : (
          <CheckOutForm
            key={vehicleId}
            vehicle={vehicle}
            vehicleId={vehicleId}
            online={online}
            toast={toast}
            onDone={() => {
              refetchOpen();
            }}
          />
        )}
      </div>

      {isAdmin && <HistoricoBitacoras vehicles={vehicles} toast={toast} />}
    </div>
  );
}

/* ============================================================
   CHECK-OUT: abre un viaje nuevo
============================================================ */
function CheckOutForm({ vehicle, vehicleId, online, toast, onDone }) {
  const [proyecto, setProyecto] = useState("");
  const [destino, setDestino] = useState("");
  const [autorizadoPor, setAutorizadoPor] = useState("");
  const [kmInicial, setKmInicial] = useState("");
  const [combustibleSalida, setCombustibleSalida] = useState("Lleno");
  const [limpieza, setLimpieza] = useState(true);
  const [incidencias, setIncidencias] = useState("");
  const [incidenciaFotos, setIncidenciaFotos] = useState([]);
  const [danios, setDanios] = useState([]);
  const [firma, setFirma] = useState(null);
  const [conformidad, setConformidad] = useState(false);
  const [voucher, setVoucher] = useState({ attached: false });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!online) return toast("Sin conexión: intenta de nuevo al recuperar señal.", "warn");
    if (!conformidad) return toast("Debes aceptar la declaración de conformidad.", "error");
    if (!firma) return toast("Captura tu firma digital antes de continuar.", "error");

    setSaving(true);
    try {
      const firmaBlob = await dataUrlToBlob(firma);
      const firmaUrl = await uploadFile(BUCKETS.signatures, `${vehicleId}/${Date.now()}_firma_salida.png`, firmaBlob);
      const gps = await captureGps();

      const { data, error } = await supabase.rpc("submit_bitacora", {
        p_vehicle_id: vehicleId,
        p_tipo: "salida",
        p_proyecto: proyecto,
        p_destino: destino,
        p_autorizado_por: autorizadoPor,
        p_km_inicial: Number(kmInicial) || vehicle?.km || 0,
        p_km_final: null,
        p_combustible_salida: combustibleSalida,
        p_combustible_regreso: null,
        p_limpieza: limpieza,
        p_incidencias: incidencias,
        p_incidencia_fotos: incidenciaFotos,
        p_danios: danios,
        p_firma_url: firmaUrl,
        p_gps_lat: gps?.lat ?? null,
        p_gps_lng: gps?.lng ?? null,
        p_voucher: voucher.attached ? voucher : null,
        p_user_agent: navigator.userAgent,
      });

      if (error) throw error;
      toast(`Viaje abierto correctamente (hash ${data.hash.slice(0, 10)}…). Al regresar, cierra este mismo viaje desde aquí.`);
      onDone();
    } catch (err) {
      toast(err.message || "No se pudo registrar la salida.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-5 pt-5 border-t border-slate-100">
      <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-1.5">
        <LogOut size={14} className="text-teal-600" /> Check-out / Salida — abrir viaje
      </p>

      <div className="grid md:grid-cols-2 gap-x-4">
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
        <Field label="Combustible al salir">
          <select className={inputCls} value={combustibleSalida} onChange={(e) => setCombustibleSalida(e.target.value)}>
            {FUEL_LEVELS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600 mb-4">
        <input type="checkbox" className="accent-teal-600" checked={limpieza} onChange={(e) => setLimpieza(e.target.checked)} />
        El vehículo se entrega limpio por dentro y por fuera.
      </label>

      <Field label="Incidencias / observaciones al salir">
        <textarea className={inputCls} rows={2} value={incidencias} onChange={(e) => setIncidencias(e.target.value)} placeholder="Describe cualquier incidencia relevante..." />
        {vehicleId && <IncidenciaFotos fotos={incidenciaFotos} onChange={setIncidenciaFotos} vehicleId={vehicleId} toast={toast} />}
      </Field>

      <div className="mb-5">
        <p className="text-xs font-semibold text-slate-600 mb-2">Mapa de desperfectos (previos al viaje)</p>
        <DamageMap damages={danios} onChange={setDanios} vehicleId={vehicleId} toast={toast} />
      </div>

      <div className="mb-5">
        <VoucherOCR voucher={voucher} setVoucher={setVoucher} vehicleId={vehicleId} toast={toast} />
      </div>

      <div className="mb-5">
        <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
          <PenTool size={14} className="text-teal-600" /> Firma digital de salida
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
        {saving ? "Guardando…" : "Registrar salida y abrir viaje"}
      </button>
    </form>
  );
}

/* ============================================================
   CHECK-IN: cierra el viaje abierto, sin perder al conductor original
============================================================ */
function CheckInForm({ vehicle, openBitacora, online, toast, onDone }) {
  const [kmFinal, setKmFinal] = useState("");
  const [combustibleRegreso, setCombustibleRegreso] = useState("Lleno");
  const [incidenciasRegreso, setIncidenciasRegreso] = useState("");
  const [incidenciaFotos, setIncidenciaFotos] = useState([]);
  const [danios, setDanios] = useState([]);
  const [firma, setFirma] = useState(null);
  const [conformidad, setConformidad] = useState(false);
  const [voucher, setVoucher] = useState({ attached: false });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!online) return toast("Sin conexión: intenta de nuevo al recuperar señal.", "warn");
    if (!conformidad) return toast("Debes aceptar la declaración de conformidad.", "error");
    if (!firma) return toast("Captura tu firma digital antes de continuar.", "error");
    if (!kmFinal) return toast("Captura el KM final.", "error");

    setSaving(true);
    try {
      const firmaBlob = await dataUrlToBlob(firma);
      const firmaUrl = await uploadFile(BUCKETS.signatures, `${openBitacora.vehicle_id}/${Date.now()}_firma_regreso.png`, firmaBlob);
      const gps = await captureGps();

      const { data, error } = await supabase.rpc("close_bitacora", {
        p_bitacora_id: openBitacora.id,
        p_km_final: Number(kmFinal),
        p_combustible_regreso: combustibleRegreso,
        p_incidencias_regreso: incidenciasRegreso,
        p_danios: danios,
        p_firma_url: firmaUrl,
        p_gps_lat: gps?.lat ?? null,
        p_gps_lng: gps?.lng ?? null,
        p_voucher: voucher.attached ? voucher : null,
        p_user_agent: navigator.userAgent,
        p_incidencia_fotos: incidenciaFotos,
      });

      if (error) throw error;
      toast(`Viaje cerrado correctamente (hash ${data.hash.slice(0, 10)}…).`);
      onDone();
    } catch (err) {
      toast(err.message || "No se pudo cerrar el viaje.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-5 pt-5 border-t border-slate-100">
      <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <LogIn size={14} className="text-blue-600" /> Check-in / Regreso — cerrar viaje abierto
      </p>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-5 text-xs text-blue-800 space-y-1">
        <p className="flex items-center gap-1.5 font-semibold"><User size={12} /> Salida registrada por: {openBitacora.profiles?.name || "—"}</p>
        <p>Fecha de salida: {fmtDate(openBitacora.created_at?.slice(0, 10))}</p>
        <p>Proyecto: {openBitacora.proyecto || "—"} · Destino: {openBitacora.destino || "—"}</p>
        <p>KM inicial registrado: <strong>{openBitacora.km_inicial}</strong></p>
      </div>

      <form onSubmit={submit}>
        <div className="grid md:grid-cols-2 gap-x-4">
          <Field label="KM final" required>
            <input type="number" className={inputCls} value={kmFinal} onChange={(e) => setKmFinal(e.target.value)} min={openBitacora.km_inicial} required />
          </Field>
          <Field label="Combustible al regresar">
            <select className={inputCls} value={combustibleRegreso} onChange={(e) => setCombustibleRegreso(e.target.value)}>
              {FUEL_LEVELS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Incidencias / observaciones al regresar">
          <textarea className={inputCls} rows={2} value={incidenciasRegreso} onChange={(e) => setIncidenciasRegreso(e.target.value)} placeholder="Describe cualquier incidencia ocurrida durante el viaje..." />
          {openBitacora.vehicle_id && <IncidenciaFotos fotos={incidenciaFotos} onChange={setIncidenciaFotos} vehicleId={openBitacora.vehicle_id} toast={toast} />}
        </Field>

        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-600 mb-2">Mapa de desperfectos (nuevos, ocurridos durante el viaje)</p>
          <DamageMap damages={danios} onChange={setDanios} vehicleId={openBitacora.vehicle_id} toast={toast} />
        </div>

        <div className="mb-5">
          <VoucherOCR voucher={voucher} setVoucher={setVoucher} vehicleId={openBitacora.vehicle_id} toast={toast} />
        </div>

        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
            <PenTool size={14} className="text-teal-600" /> Firma digital de regreso
          </p>
          <SignaturePad onChange={setFirma} />
        </div>

        <label className="flex items-start gap-2 text-xs text-slate-600 mb-5 bg-slate-50 rounded-lg p-3 border border-slate-100">
          <input type="checkbox" className="accent-teal-600 mt-0.5" checked={conformidad} onChange={(e) => setConformidad(e.target.checked)} />
          Declaro que la información capturada es verídica y refleja el estado real del vehículo al momento del registro.
          Entiendo que este registro quedará almacenado de forma inmutable para fines de auditoría.
        </label>

        <button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? "Guardando…" : "Registrar regreso y cerrar viaje"}
        </button>
      </form>
    </div>
  );
}
