import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  LayoutDashboard, Calendar, ClipboardList, Wrench, ShieldCheck, Settings,
  Search, Plus, X, Check, ChevronLeft, ChevronRight, Zap, QrCode, Camera,
  Fuel, Gauge, MapPin, Users, LogOut, Eye, EyeOff, Download, Upload,
  AlertTriangle, CheckCircle2, Clock, FileText, Car, Trash2, Edit2,
  Lock, Mail, ArrowRight, Loader2, ChevronDown, Filter, Image as ImageIcon,
  Activity, TrendingUp, DollarSign, RotateCcw, Save, ExternalLink, Sparkles,
  UserPlus, Building2, Droplets, Wind, CircleDot, PenTool, WifiOff, Wifi,
  BadgeCheck, ScanLine, KeyRound, Copy, ArrowLeft, Trash, PlusCircle
} from "lucide-react";
import * as XLSX from "xlsx";

/* ============================================================
   HELPERS
============================================================ */
const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 9)}`;

const todayISO = () => new Date().toISOString().slice(0, 10);

const addDays = (dateStr, n) => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const dayLabel = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("es-MX", { weekday: "short" });

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return "sha_" + Math.abs(hash).toString(16) + Date.now().toString(16).slice(-6);
}

function exportToExcel(rows, filename, sheetName = "Datos") {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

const FUEL_LEVELS = ["Vacío", "1/4", "1/2", "3/4", "Lleno"];
const FUEL_TO_PCT = { "Vacío": 0.04, "1/4": 0.25, "1/2": 0.5, "3/4": 0.75, "Lleno": 1 };

const STATUS_META = {
  disponible: { label: "Disponible", dot: "#22c55e", bg: "#dcfce7", text: "#166534" },
  en_uso: { label: "En Uso", dot: "#3b82f6", bg: "#dbeafe", text: "#1e40af" },
  reservado: { label: "Reservado", dot: "#eab308", bg: "#fef9c3", text: "#854d0e" },
  mantenimiento: { label: "Mantenimiento", dot: "#ef4444", bg: "#fee2e2", text: "#991b1b" },
};

/* ============================================================
   MOCK DATA
============================================================ */
const INIT_VEHICLES = [
  { id: "veh_1", plate: "NLE-4471", brand: "Nissan", model: "Versa", year: 2023, category: "Sedán", status: "disponible", km: 18420, fuel: "3/4", photo: "https://images.unsplash.com/photo-1590362891991-f776e747a588?q=80&w=800&auto=format&fit=crop", docs: { circulacion: true, seguro: true, verificacion: true, licenciaAsociada: true }, project: null },
  { id: "veh_2", plate: "NLE-2290", brand: "Toyota", model: "Hilux", year: 2022, category: "Pickup", status: "en_uso", km: 52310, fuel: "1/2", photo: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=800&auto=format&fit=crop", docs: { circulacion: true, seguro: true, verificacion: false, licenciaAsociada: true }, project: "Planta Escobedo" },
  { id: "veh_3", plate: "NLE-8813", brand: "Chevrolet", model: "Suburban", year: 2021, category: "SUV", status: "reservado", km: 71040, fuel: "Lleno", photo: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?q=80&w=800&auto=format&fit=crop", docs: { circulacion: true, seguro: true, verificacion: true, licenciaAsociada: true }, project: null },
  { id: "veh_4", plate: "NLE-1157", brand: "Ford", model: "Transit", year: 2020, category: "Van", status: "mantenimiento", km: 98230, fuel: "1/4", photo: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?q=80&w=800&auto=format&fit=crop", docs: { circulacion: true, seguro: false, verificacion: true, licenciaAsociada: true }, project: null },
  { id: "veh_5", plate: "NLE-3305", brand: "Nissan", model: "NP300", year: 2023, category: "Pickup", status: "disponible", km: 12980, fuel: "Lleno", photo: "https://images.unsplash.com/photo-1594502184342-2543f757d0eb?q=80&w=800&auto=format&fit=crop", docs: { circulacion: true, seguro: true, verificacion: true, licenciaAsociada: true }, project: null },
  { id: "veh_6", plate: "NLE-6602", brand: "Volkswagen", model: "Jetta", year: 2022, category: "Sedán", status: "disponible", km: 34110, fuel: "1/2", photo: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?q=80&w=800&auto=format&fit=crop", docs: { circulacion: true, seguro: true, verificacion: true, licenciaAsociada: true }, project: null },
];

const INIT_USERS = [
  { id: "u_admin", name: "Ana Torres", email: "ana.torres@energiasecing.mx", role: "administrador", password: "Secing2024!", status: "activo", area: "Recursos Humanos" },
  { id: "u_1", name: "Luis Hernández", email: "luis.hernandez@energiasecing.mx", role: "trabajador", password: "Trabajo123", status: "activo", area: "Operaciones" },
  { id: "u_2", name: "María Salinas", email: "maria.salinas@energiasecing.mx", role: "trabajador", password: "Trabajo123", status: "activo", area: "Ingeniería" },
  { id: "u_3", name: "Jorge Cantú", email: "jorge.cantu@energiasecing.mx", role: "trabajador", password: "", status: "invitado", area: "Mantenimiento" },
];

function buildInitReservations() {
  const t = todayISO();
  return [
    { id: uid("res"), vehicleId: "veh_3", userId: "u_1", start: addDays(t, 0), end: addDays(t, 1), project: "Planta Apodaca", destino: "Apodaca, N.L.", autorizadoPor: "Ana Torres" },
    { id: uid("res"), vehicleId: "veh_2", userId: "u_2", start: addDays(t, -1), end: addDays(t, 2), project: "Planta Escobedo", destino: "Escobedo, N.L.", autorizadoPor: "Ana Torres" },
    { id: uid("res"), vehicleId: "veh_5", userId: "u_1", start: addDays(t, 2), end: addDays(t, 3), project: "Cliente Frisa", destino: "García, N.L.", autorizadoPor: "Ana Torres" },
    { id: uid("res"), vehicleId: "veh_6", userId: "u_2", start: addDays(t, 4), end: addDays(t, 4), project: "Visita corporativa", destino: "Monterrey, N.L.", autorizadoPor: "Ana Torres" },
  ];
}

function buildInitBitacoras() {
  const t = todayISO();
  return [
    {
      id: uid("bit"), vehicleId: "veh_2", userId: "u_2", tipo: "cerrada",
      proyecto: "Planta Escobedo", destino: "Escobedo, N.L.", autorizadoPor: "Ana Torres",
      salida: `${addDays(t, -1)}T08:10`, regreso: `${addDays(t, -1)}T17:40`,
      kmInicial: 52100, kmFinal: 52310, combustibleSalida: "Lleno", combustibleRegreso: "1/2",
      limpieza: true, incidencias: "Sin novedades.",
      danios: [], firmaDataUrl: null,
      gps: { lat: 25.6667, lng: -100.2833 },
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      hash: simpleHash("bitacora-demo-1"),
    },
  ];
}

const INIT_MAINTENANCE = [
  { id: uid("mnt"), vehicleId: "veh_4", tipo: "Correctivo", taller: "Taller Central Monterrey", descripcion: "Fuga en sistema de frenos", costo: 4200, estado: "En proceso", fecha: todayISO() },
  { id: uid("mnt"), vehicleId: "veh_1", tipo: "Preventivo", taller: "Servicio Nissan NL", descripcion: "Cambio de aceite y filtros (10,000 km)", costo: 1350, estado: "Completado", fecha: addDays(todayISO(), -12) },
  { id: uid("mnt"), vehicleId: "veh_3", tipo: "Preventivo", taller: "Chevrolet Cumbres", descripcion: "Rotación de llantas y balanceo", costo: 980, estado: "Programado", fecha: addDays(todayISO(), 5) },
];

const DAMAGE_ZONES = [
  { id: "frontal", label: "Frontal", x: 148, y: 20, w: 64, h: 46 },
  { id: "trasera", label: "Trasera", x: 148, y: 234, w: 64, h: 46 },
  { id: "lat_izq", label: "Lateral Izq.", x: 40, y: 90, w: 44, h: 120 },
  { id: "lat_der", label: "Lateral Der.", x: 276, y: 90, w: 44, h: 120 },
  { id: "otras", label: "Otras / Toldo", x: 148, y: 96, w: 64, h: 108 },
];

const CONDITION_MATRIX_ITEMS = [
  "Carrocería y pintura", "Llantas y rines", "Luces delanteras/traseras",
  "Motor y niveles de fluidos", "Frenos", "Suspensión", "Interiores y tapicería",
  "Cinturones de seguridad", "Aire acondicionado", "Sistema eléctrico",
];

const SAFETY_EQUIPMENT = ["Llanta de refacción", "Gato hidráulico", "Llave de cruz", "Extintor vigente", "Reflejantes", "Cables pasa-corriente", "Botiquín"];

const DOC_ITEMS = [
  { key: "circulacion", label: "Tarjeta de Circulación" },
  { key: "seguro", label: "Seguro Vigente" },
  { key: "verificacion", label: "Verificación Vehicular" },
  { key: "licenciaAsociada", label: "Licencia del Conductor Asociado" },
];

/* ============================================================
   SMALL UI PRIMITIVES
============================================================ */
const Badge = ({ status, size = "md" }) => {
  const m = STATUS_META[status] || STATUS_META.disponible;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1"}`}
      style={{ background: m.bg, color: m.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
};

const Pill = ({ ok, label }) => (
  <span
    className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full font-medium border ${
      ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
    }`}
  >
    {ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
    {label}
  </span>
);

function Toasts({ toasts, remove }) {
  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-xl shadow-lg border px-4 py-3 flex items-start gap-3 animate-[fadeIn_0.2s_ease] ${
            t.type === "error" ? "bg-rose-50 border-rose-200" : t.type === "warn" ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"
          }`}
        >
          <div className={`mt-0.5 ${t.type === "error" ? "text-rose-600" : t.type === "warn" ? "text-amber-600" : "text-teal-600"}`}>
            {t.type === "error" ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          </div>
          <div className="flex-1 text-sm text-slate-700">{t.msg}</div>
          <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

function Modal({ open, onClose, title, children, width = "max-w-lg", icon }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-[fadeIn_0.15s_ease]">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${width} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            {icon}
            {title}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, required }) {
  return (
    <label className="block mb-4">
      <span className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition";

function PasswordStrength({ value }) {
  const score = useMemo(() => {
    let s = 0;
    if (value.length >= 8) s++;
    if (/[A-Z]/.test(value)) s++;
    if (/[0-9]/.test(value)) s++;
    if (/[^A-Za-z0-9]/.test(value)) s++;
    return s;
  }, [value]);
  const labels = ["Muy débil", "Débil", "Media", "Fuerte", "Muy fuerte"];
  const colors = ["#ef4444", "#ef4444", "#eab308", "#22c55e", "#0d9488"];
  return (
    <div className="mt-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: score > i ? "100%" : "0%", background: colors[score] }}
            />
          </div>
        ))}
      </div>
      {value.length > 0 && (
        <p className="text-[11px] mt-1 font-medium" style={{ color: colors[score] }}>
          {labels[score]} {value.length < 8 && "· mínimo 8 caracteres"}
        </p>
      )}
    </div>
  );
}

/* Pulse logo mark used across the app */
function PulseMark({ size = 28, color = "#2dd4bf" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="#090d16" />
      <path d="M5 21h6l3-9 5 17 4-13 2 5h10" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function SignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);

  useEffect(() => {
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
  }, []);

  const pos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - rect.left, y: p.clientY - rect.top };
  };

  const start = (e) => {
    drawing.current = true;
    last.current = pos(e);
  };
  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(canvasRef.current.toDataURL());
  };
  const clear = () => {
    const c = canvasRef.current;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
    onChange(null);
  };

  return (
    <div>
      <div className="border-2 border-dashed border-slate-200 rounded-xl overflow-hidden bg-slate-50">
        <canvas
          ref={canvasRef}
          width={460}
          height={140}
          className="w-full touch-none cursor-crosshair bg-white"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
      </div>
      <button type="button" onClick={clear} className="mt-2 text-xs font-medium text-slate-500 hover:text-rose-600 flex items-center gap-1">
        <RotateCcw size={12} /> Limpiar firma
      </button>
    </div>
  );
}

function FauxQR({ seed, size = 140 }) {
  const cells = 15;
  const grid = useMemo(() => {
    let s = 0;
    for (let i = 0; i < seed.length; i++) s += seed.charCodeAt(i) * (i + 1);
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    const g = [];
    for (let i = 0; i < cells; i++) {
      const row = [];
      for (let j = 0; j < cells; j++) {
        const isFinder = (i < 4 && j < 4) || (i < 4 && j > cells - 5) || (i > cells - 5 && j < 4);
        row.push(isFinder ? (i === 0 || i === 3 || j === 0 || j === 3 || (i > cells - 5 && (i === cells - 4 || i === cells - 1)) ? 1 : (i < 4 && j < 4) || (i < 4 && j > cells - 5) || (i > cells - 5 && j < 4) ? (i > 0 && i < 3 && j > 0 && j < 3 ? 1 : 0) : 0) : rnd() > 0.55 ? 1 : 0);
      }
      g.push(row);
    }
    return g;
  }, [seed]);
  const cell = size / cells;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-lg bg-white p-1 border border-slate-200">
      {grid.map((row, i) => row.map((v, j) => (v ? <rect key={`${i}-${j}`} x={j * cell} y={i * cell} width={cell} height={cell} fill="#090d16" /> : null)))}
    </svg>
  );
}

/* ============================================================
   LOGIN + SET PASSWORD SCREENS
============================================================ */
function LoginScreen({ branding, users, onLogin, goSetPassword }) {
  const [email, setEmail] = useState("ana.torres@energiasecing.mx");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      const u = users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
      if (!u) {
        setError("No existe una cuenta con este correo. Contacta a tu administrador.");
        setLoading(false);
        return;
      }
      if (u.status === "invitado") {
        setError("Tu cuenta aún no tiene contraseña. Usa el enlace de invitación enviado a tu correo.");
        setLoading(false);
        return;
      }
      if (u.password !== password) {
        setError("Contraseña incorrecta. Inténtalo de nuevo.");
        setLoading(false);
        return;
      }
      setLoading(false);
      onLogin(u);
    }, 550);
  };

  return (
    <div className="min-h-screen w-full flex bg-[#090d16] relative overflow-hidden">
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}} @keyframes pulseLine{0%{stroke-dashoffset:340}100%{stroke-dashoffset:0}}`}</style>
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] p-12 relative">
        <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: `url(${branding.loginBanner})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="absolute inset-0 bg-gradient-to-br from-[#090d16] via-[#0b1020]/90 to-[#0d1420]" />
        <div className="relative z-10 flex items-center gap-3">
          <PulseMark size={40} />
          <div>
            <p className="text-white font-bold text-lg tracking-tight">{branding.name}</p>
            <p className="text-teal-300/70 text-[11px] font-medium">by Energía Secing</p>
          </div>
        </div>
        <div className="relative z-10">
          <svg viewBox="0 0 400 100" className="w-full h-24 mb-6 opacity-90">
            <path d="M0 50 H80 L100 15 L130 85 L155 30 L175 50 H400" stroke="#2dd4bf" strokeWidth="2" fill="none" strokeDasharray="340" style={{ animation: "pulseLine 2.4s ease-in-out infinite alternate" }} />
          </svg>
          <h1 className="text-white text-4xl font-bold tracking-tight leading-tight mb-3">{branding.loginTitle}</h1>
          <p className="text-slate-400 text-sm max-w-sm">Control en tiempo real de reservas, bitácoras, mantenimientos e inspecciones de tu flotilla vehicular.</p>
        </div>
        <p className="relative z-10 text-slate-500 text-[11px]">{branding.footerText}</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-950 lg:bg-[#f8fafc]">
        <div className="w-full max-w-sm">
          <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <PulseMark size={34} />
            <span className="text-white lg:text-slate-900 font-bold text-lg">{branding.name}</span>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Inicia sesión</h2>
            <p className="text-sm text-slate-500 mb-6">Accede con tu correo corporativo asignado.</p>
            <form onSubmit={submit}>
              <Field label="Correo electrónico" required>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className={`${inputCls} pl-9`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@energiasecing.mx" required />
                </div>
              </Field>
              <Field label="Contraseña" required>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className={`${inputCls} pl-9 pr-9`} type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                  <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              {error && (
                <div className="mb-4 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg px-3 py-2 flex items-center gap-2">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}
              <button type="submit" disabled={loading} className="w-full bg-[#090d16] hover:bg-[#131a2c] text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-60">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                {loading ? "Verificando..." : "Iniciar sesión"}
              </button>
            </form>
            <div className="mt-5 pt-5 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400">
                El autorregistro está deshabilitado. Solo el administrador puede invitar colaboradores.
              </p>
              <button onClick={() => goSetPassword("demo_token")} className="mt-2 text-[11px] text-teal-600 hover:underline font-medium">
                ¿Tienes un enlace de invitación? Simular apertura
              </button>
            </div>
          </div>
          <p className="text-center text-[11px] text-slate-500 lg:text-slate-400 mt-6">{branding.footerText}</p>
        </div>
      </div>
    </div>
  );
}

function SetPasswordScreen({ branding, invitedUser, onComplete }) {
  const [initialLoading, setInitialLoading] = useState(true);
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setInitialLoading(false), 900);
    return () => clearTimeout(t);
  }, []);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center gap-4">
        <PulseMark size={48} />
        <Loader2 className="animate-spin text-teal-400" size={22} />
        <p className="text-slate-400 text-sm">Validando enlace de invitación…</p>
      </div>
    );
  }

  const submit = (e) => {
    e.preventDefault();
    setError("");
    if (p1.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
    if (p1 !== p2) return setError("Las contraseñas no coinciden.");
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      onComplete(p1);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      <div className="w-full max-w-sm relative z-10">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <PulseMark size={34} />
          <span className="text-white font-bold text-lg">{branding.name}</span>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
            <KeyRound size={20} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Crea tu contraseña</h2>
          <p className="text-sm text-slate-500 mb-6">
            Hola{invitedUser ? `, ${invitedUser.name.split(" ")[0]}` : ""}. Configura tus credenciales para acceder a {branding.name}.
          </p>
          <form onSubmit={submit}>
            <Field label="Nueva contraseña" required>
              <input className={inputCls} type="password" value={p1} onChange={(e) => setP1(e.target.value)} placeholder="Mínimo 8 caracteres" />
              <PasswordStrength value={p1} />
            </Field>
            <Field label="Confirmar contraseña" required>
              <input className={inputCls} type="password" value={p2} onChange={(e) => setP2(e.target.value)} placeholder="Repite tu contraseña" />
            </Field>
            {error && (
              <div className="mb-4 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <AlertTriangle size={14} /> {error}
              </div>
            )}
            <button type="submit" disabled={saving} className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Crear contraseña
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SIDEBAR + FLEET PANEL
============================================================ */
const NAV_ADMIN = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "reservas", label: "Calendario", icon: Calendar },
  { key: "bitacora", label: "Bitácora", icon: ClipboardList },
  { key: "mantenimientos", label: "Mantenimientos", icon: Wrench },
  { key: "inspecciones", label: "Inspecciones", icon: ShieldCheck },
  { key: "configuracion", label: "Configuración", icon: Settings },
];
const NAV_WORKER = [
  { key: "reservas", label: "Calendario", icon: Calendar },
  { key: "bitacora", label: "Bitácora", icon: ClipboardList },
];

function Sidebar({ branding, view, navigate, role, onLogout, currentUser, onLightning }) {
  const items = role === "administrador" ? NAV_ADMIN : NAV_WORKER;
  return (
    <div className="w-[76px] shrink-0 bg-[#090d16] flex flex-col items-center py-5 gap-1">
      <div className="mb-6">
        <PulseMark size={38} />
      </div>
      <div className="flex-1 flex flex-col gap-1.5 w-full items-center">
        {items.map((it) => {
          const Icon = it.icon;
          const active = view === it.key;
          return (
            <button
              key={it.key}
              onClick={() => navigate(it.key)}
              title={it.label}
              className={`group relative w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                active ? "bg-teal-500/15 text-teal-400" : "text-slate-500 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              {active && <span className="absolute left-[-13px] w-1 h-6 bg-teal-400 rounded-r-full" />}
              <Icon size={19} strokeWidth={2} />
              <span className="pointer-events-none absolute left-16 z-50 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-[11px] text-white opacity-0 group-hover:opacity-100 transition shadow-lg">
                {it.label}
              </span>
            </button>
          );
        })}
      </div>

      {onLightning && (
        <button
          onClick={onLightning}
          title="Acción rápida"
          className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/30 hover:scale-105 transition mb-3"
        >
          <Zap size={18} fill="white" />
        </button>
      )}

      <div className="w-9 h-9 rounded-full bg-slate-700 text-white text-xs font-bold flex items-center justify-center mb-2" title={currentUser.name}>
        {currentUser.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
      </div>
      <button onClick={onLogout} title="Cerrar sesión" className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-white/5 transition">
        <LogOut size={17} />
      </button>
    </div>
  );
}

function FleetPanel({ vehicles, selectedId, onSelect, onNewReservation }) {
  const [q, setQ] = useState("");
  const filtered = vehicles.filter((v) => `${v.brand} ${v.model} ${v.plate} ${v.category}`.toLowerCase().includes(q.toLowerCase()));
  const grouped = filtered.reduce((acc, v) => {
    acc[v.category] = acc[v.category] || [];
    acc[v.category].push(v);
    return acc;
  }, {});

  return (
    <div className="w-[320px] shrink-0 border-r border-slate-200 bg-white flex flex-col h-full">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800 text-sm">Flotilla</h3>
          <span className="text-[11px] text-slate-400 font-medium">{filtered.length} unidades</span>
        </div>
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por placa, marca..." className={`${inputCls} pl-8 text-xs`} />
        </div>
        <button onClick={onNewReservation} className="w-full flex items-center justify-center gap-1.5 bg-[#090d16] hover:bg-[#161d30] text-white text-xs font-semibold rounded-lg py-2.5 transition">
          <Plus size={14} /> Nueva Reserva
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {Object.keys(grouped).length === 0 && <p className="text-xs text-slate-400 text-center mt-8">Sin resultados.</p>}
        {Object.entries(grouped).map(([cat, vs]) => (
          <div key={cat} className="mb-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5">{cat}</p>
            {vs.map((v) => (
              <button
                key={v.id}
                onClick={() => onSelect(v.id)}
                className={`w-full text-left rounded-xl p-2.5 mb-1.5 flex items-center gap-3 transition border ${
                  selectedId === v.id ? "bg-teal-50 border-teal-200" : "border-transparent hover:bg-slate-50"
                }`}
              >
                <img src={v.photo} alt={v.model} className="w-12 h-10 rounded-lg object-cover shrink-0 bg-slate-100" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{v.brand} {v.model}</p>
                  <p className="text-[11px] text-slate-400 font-mono">{v.plate}</p>
                </div>
                <Badge status={v.status} size="sm" />
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function FuelGauge({ level }) {
  const pct = FUEL_TO_PCT[level] ?? 0.5;
  return (
    <div className="flex items-center gap-2">
      <Fuel size={14} className="text-slate-400" />
      <div className="w-20 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-teal-500" style={{ width: `${pct * 100}%` }} />
      </div>
      <span className="text-[11px] font-medium text-slate-500">{level}</span>
    </div>
  );
}

function VehicleBanner({ vehicle }) {
  if (!vehicle) return null;
  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row">
      <div className="md:w-64 h-40 md:h-auto shrink-0">
        <img src={vehicle.photo} alt={vehicle.model} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 p-5">
        <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{vehicle.brand} {vehicle.model} <span className="text-slate-400 font-medium">· {vehicle.year}</span></h2>
            <p className="text-sm font-mono text-slate-500 tracking-wide">{vehicle.plate} · {vehicle.category}</p>
          </div>
          <Badge status={vehicle.status} />
        </div>
        <div className="flex flex-wrap items-center gap-5 mb-3">
          <div className="flex items-center gap-1.5 text-sm text-slate-600"><Gauge size={14} className="text-slate-400" /> {vehicle.km.toLocaleString()} km</div>
          <FuelGauge level={vehicle.fuel} />
          {vehicle.project && <div className="flex items-center gap-1.5 text-sm text-slate-600"><Building2 size={14} className="text-slate-400" /> {vehicle.project}</div>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DOC_ITEMS.map((d) => (
            <Pill key={d.key} ok={vehicle.docs[d.key]} label={d.label} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   DASHBOARD
============================================================ */
function Dashboard({ vehicles, bitacoras, maintenance }) {
  const statusCounts = useMemo(() => {
    const c = { disponible: 0, en_uso: 0, reservado: 0, mantenimiento: 0 };
    vehicles.forEach((v) => c[v.status]++);
    return c;
  }, [vehicles]);

  const totalKm = bitacoras.reduce((s, b) => s + Math.max(0, (b.kmFinal || 0) - (b.kmInicial || 0)), 0);
  const totalCost = maintenance.reduce((s, m) => s + (Number(m.costo) || 0), 0) + bitacoras.length * 850;
  const costPerKm = totalKm > 0 ? (totalCost / totalKm).toFixed(2) : "0.00";

  const kpis = [
    { label: "Vehículos totales", value: vehicles.length, icon: Car, color: "bg-slate-100 text-slate-700" },
    { label: "Disponibles", value: statusCounts.disponible, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600" },
    { label: "En uso", value: statusCounts.en_uso, icon: Activity, color: "bg-blue-50 text-blue-600" },
    { label: "En mantenimiento", value: statusCounts.mantenimiento, icon: Wrench, color: "bg-rose-50 text-rose-600" },
    { label: "Costo por KM", value: `$${costPerKm}`, icon: DollarSign, color: "bg-amber-50 text-amber-600" },
    { label: "Bitácoras registradas", value: bitacoras.length, icon: ClipboardList, color: "bg-teal-50 text-teal-600" },
  ];

  const maxCount = Math.max(1, ...Object.values(statusCounts));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Panel General</h1>
        <p className="text-sm text-slate-500">Resumen operativo de la flotilla en tiempo real.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${k.color}`}>
              <k.icon size={16} />
            </div>
            <p className="text-xl font-bold text-slate-900">{k.value}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-4">Distribución de estatus de flotilla</h3>
          <div className="space-y-3">
            {Object.entries(statusCounts).map(([k, v]) => (
              <div key={k} className="flex items-center gap-3">
                <span className="w-28 text-xs text-slate-500 shrink-0">{STATUS_META[k].label}</span>
                <div className="flex-1 h-6 rounded-lg bg-slate-50 overflow-hidden">
                  <div className="h-full rounded-lg flex items-center justify-end px-2" style={{ width: `${(v / maxCount) * 100}%`, background: STATUS_META[k].dot }}>
                    <span className="text-[11px] font-bold text-white">{v}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2"><TrendingUp size={15} className="text-teal-600" /> Últimos mantenimientos</h3>
          <div className="space-y-3">
            {maintenance.slice(0, 4).map((m) => {
              const v = vehicles.find((x) => x.id === m.vehicleId);
              return (
                <div key={m.id} className="flex items-center justify-between text-xs border-b border-slate-50 pb-2 last:border-0">
                  <div>
                    <p className="font-medium text-slate-700">{v?.plate} · {m.tipo}</p>
                    <p className="text-slate-400">{fmtDate(m.fecha)}</p>
                  </div>
                  <span className="font-semibold text-slate-600">${Number(m.costo).toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   RESERVAS / CALENDARIO (Drag & Drop)
============================================================ */
function NewReservationModal({ open, onClose, vehicles, users, onCreate, defaultVehicleId }) {
  const [form, setForm] = useState({ vehicleId: defaultVehicleId || "", userId: "", project: "", destino: "", autorizadoPor: "", start: todayISO(), end: todayISO() });
  useEffect(() => {
    if (open) setForm((f) => ({ ...f, vehicleId: defaultVehicleId || vehicles[0]?.id || "" }));
  }, [open, defaultVehicleId]);

  const submit = (e) => {
    e.preventDefault();
    if (!form.vehicleId || !form.userId || !form.start || !form.end) return;
    onCreate({ ...form, id: uid("res") });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Nueva Reserva" icon={<Calendar size={16} className="text-teal-600" />}>
      <form onSubmit={submit}>
        <Field label="Vehículo" required>
          <select className={inputCls} value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.brand} {v.model} — {v.plate}</option>)}
          </select>
        </Field>
        <Field label="Colaborador" required>
          <select className={inputCls} value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
            <option value="">Selecciona…</option>
            {users.filter((u) => u.status === "activo").map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha inicio" required>
            <input type="date" className={inputCls} value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
          </Field>
          <Field label="Fecha fin" required>
            <input type="date" className={inputCls} value={form.end} min={form.start} onChange={(e) => setForm({ ...form, end: e.target.value })} />
          </Field>
        </div>
        <Field label="Proyecto / Cliente (Centro de Costos)">
          <input className={inputCls} value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} placeholder="Ej. Planta Escobedo" />
        </Field>
        <Field label="Destino">
          <input className={inputCls} value={form.destino} onChange={(e) => setForm({ ...form, destino: e.target.value })} placeholder="Ej. García, N.L." />
        </Field>
        <Field label="Autorizado por">
          <input className={inputCls} value={form.autorizadoPor} onChange={(e) => setForm({ ...form, autorizadoPor: e.target.value })} placeholder="Nombre del autorizador" />
        </Field>
        <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold mt-2">Confirmar reserva</button>
      </form>
    </Modal>
  );
}

function ReservasView({ vehicles, users, reservations, setReservations, role, toast, openNewReservation, weekOffset, setWeekOffset }) {
  const weekStart = addDays(todayISO(), weekOffset * 7 - new Date(todayISO() + "T00:00:00").getDay() + 1);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const [selectedVehicles, setSelectedVehicles] = useState(vehicles.map((v) => v.id));
  const [dragged, setDragged] = useState(null);

  useEffect(() => setSelectedVehicles(vehicles.map((v) => v.id)), [vehicles.length]);

  const toggleVehicle = (id) => setSelectedVehicles((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const overlaps = (vehicleId, start, end, excludeId) =>
    reservations.some((r) => r.vehicleId === vehicleId && r.id !== excludeId && !(end < r.start || start > r.end));

  const handleDrop = (vehicleId, dayIso) => {
    if (role !== "administrador" || !dragged) return;
    const r = reservations.find((x) => x.id === dragged);
    if (!r) return;
    const duration = (new Date(r.end) - new Date(r.start)) / 86400000;
    const newStart = dayIso;
    const newEnd = addDays(dayIso, duration);
    if (overlaps(vehicleId, newStart, newEnd, r.id)) {
      toast("No se puede mover la reserva: existe un empalme de horario", "error");
      setDragged(null);
      return;
    }
    setReservations((prev) => prev.map((x) => (x.id === r.id ? { ...x, vehicleId, start: newStart, end: newEnd } : x)));
    toast("Reserva reubicada correctamente.");
    setDragged(null);
  };

  const visibleVehicles = vehicles.filter((v) => selectedVehicles.includes(v.id));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Calendario de Reservas</h1>
          <p className="text-sm text-slate-500">
            {role === "administrador" ? "Arrastra una reserva para reprogramarla." : "Consulta la disponibilidad de la flotilla."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset((w) => w - 1)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50"><ChevronLeft size={15} /></button>
          <span className="text-xs font-semibold text-slate-600 w-40 text-center">{fmtDate(days[0])} – {fmtDate(days[6])}</span>
          <button onClick={() => setWeekOffset((w) => w + 1)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50"><ChevronRight size={15} /></button>
          <button onClick={() => openNewReservation()} className="ml-2 flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg px-3 py-2"><Plus size={14} /> Nueva reserva</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Filter size={13} /> Filtrar unidades</p>
          <div className="flex gap-2">
            <button onClick={() => setSelectedVehicles(vehicles.map((v) => v.id))} className="text-[11px] font-medium text-teal-600 hover:underline">Seleccionar todos</button>
            <button onClick={() => setSelectedVehicles([])} className="text-[11px] font-medium text-slate-400 hover:underline">Desmarcar todos</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {vehicles.map((v) => (
            <label key={v.id} className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border cursor-pointer transition ${selectedVehicles.includes(v.id) ? "bg-teal-50 border-teal-200 text-teal-700" : "border-slate-200 text-slate-500"}`}>
              <input type="checkbox" className="accent-teal-600" checked={selectedVehicles.includes(v.id)} onChange={() => toggleVehicle(v.id)} />
              {v.plate}
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[160px_repeat(7,1fr)] border-b border-slate-100">
            <div className="p-3 text-[11px] font-bold text-slate-400 uppercase">Vehículo</div>
            {days.map((d) => (
              <div key={d} className="p-3 text-center border-l border-slate-100">
                <p className="text-[11px] font-bold text-slate-500 uppercase">{dayLabel(d)}</p>
                <p className={`text-xs font-semibold ${d === todayISO() ? "text-teal-600" : "text-slate-700"}`}>{fmtDate(d).split(" ")[0]}</p>
              </div>
            ))}
          </div>
          {visibleVehicles.map((v) => (
            <div key={v.id} className="grid grid-cols-[160px_repeat(7,1fr)] border-b border-slate-50 last:border-0">
              <div className="p-3 flex items-center gap-2">
                <img src={v.photo} className="w-8 h-7 rounded object-cover" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-700 truncate">{v.brand} {v.model}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{v.plate}</p>
                </div>
              </div>
              {days.map((d) => {
                const dayReservations = reservations.filter((r) => r.vehicleId === v.id && d >= r.start && d <= r.end);
                return (
                  <div
                    key={d}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(v.id, d)}
                    className="border-l border-slate-50 p-1.5 min-h-[56px] hover:bg-slate-50/50 transition"
                  >
                    {dayReservations.map((r) => {
                      const user = users.find((u) => u.id === r.userId);
                      return (
                        <div
                          key={r.id}
                          draggable={role === "administrador"}
                          onDragStart={() => setDragged(r.id)}
                          title={`${user?.name || ""} · ${r.project || ""}`}
                          className={`text-[10px] rounded-md px-1.5 py-1 mb-1 font-medium truncate bg-amber-100 text-amber-800 border border-amber-200 ${role === "administrador" ? "cursor-grab active:cursor-grabbing" : ""}`}
                        >
                          {user?.name?.split(" ")[0] || "—"} · {r.destino || r.project || "Viaje"}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
          {visibleVehicles.length === 0 && <p className="text-sm text-slate-400 text-center py-10">Selecciona al menos una unidad para ver el calendario.</p>}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   BITÁCORA (Check-in / Check-out)
============================================================ */
function DamageMap({ damages, onChange }) {
  const [active, setActive] = useState(null);
  const toggleZone = (zoneId) => {
    const exists = damages.find((d) => d.zone === zoneId);
    if (exists) {
      onChange(damages.filter((d) => d.zone !== zoneId));
      setActive(null);
    } else {
      onChange([...damages, { zone: zoneId, note: "", hasPhoto: false }]);
      setActive(zoneId);
    }
  };
  const updateNote = (zoneId, note) => onChange(damages.map((d) => (d.zone === zoneId ? { ...d, note } : d)));
  const attachPhoto = (zoneId) => onChange(damages.map((d) => (d.zone === zoneId ? { ...d, hasPhoto: true } : d)));

  return (
    <div className="grid md:grid-cols-[220px_1fr] gap-5">
      <div className="flex justify-center">
        <svg width={220} height={300} viewBox="0 0 360 300">
          <rect x="120" y="10" width="120" height="280" rx="28" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
          <rect x="140" y="70" width="80" height="60" rx="8" fill="#e2e8f0" />
          {DAMAGE_ZONES.map((z) => {
            const isDamaged = damages.some((d) => d.zone === z.id);
            return (
              <rect
                key={z.id}
                x={z.x} y={z.y} width={z.w} height={z.h} rx={8}
                fill={isDamaged ? "#fecaca" : "transparent"}
                stroke={isDamaged ? "#ef4444" : "#94a3b8"}
                strokeWidth={isDamaged ? 2 : 1}
                strokeDasharray={isDamaged ? "0" : "4 3"}
                className="cursor-pointer"
                onClick={() => toggleZone(z.id)}
              />
            );
          })}
        </svg>
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-3">Haz clic en una zona del vehículo para marcar un desperfecto y adjuntar evidencia.</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {DAMAGE_ZONES.map((z) => {
            const isDamaged = damages.some((d) => d.zone === z.id);
            return (
              <button
                key={z.id}
                type="button"
                onClick={() => toggleZone(z.id)}
                className={`text-[11px] px-2.5 py-1.5 rounded-lg border font-medium transition ${isDamaged ? "bg-rose-50 border-rose-200 text-rose-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
              >
                {z.label}
              </button>
            );
          })}
        </div>
        {damages.length === 0 && <p className="text-xs text-emerald-600 flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2"><CheckCircle2 size={13} /> Sin desperfectos reportados.</p>}
        {damages.map((d) => {
          const zone = DAMAGE_ZONES.find((z) => z.id === d.zone);
          return (
            <div key={d.zone} className="border border-rose-100 bg-rose-50/50 rounded-xl p-3 mb-2">
              <p className="text-xs font-semibold text-rose-700 mb-1.5">{zone?.label}</p>
              <input value={d.note} onChange={(e) => updateNote(d.zone, e.target.value)} placeholder="Describe el desperfecto..." className={`${inputCls} text-xs mb-2 bg-white`} />
              <button type="button" onClick={() => attachPhoto(d.zone)} className={`text-[11px] flex items-center gap-1.5 font-medium ${d.hasPhoto ? "text-emerald-600" : "text-slate-500 hover:text-teal-600"}`}>
                <Camera size={13} /> {d.hasPhoto ? "Evidencia adjuntada" : "Adjuntar foto de evidencia"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VoucherOCR({ voucher, setVoucher, toast }) {
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef();

  const handleFile = () => {
    setProcessing(true);
    setTimeout(() => {
      const estaciones = ["Pemex Gonzalitos", "Oxxo Gas Constitución", "Pemex García", "Shell Cumbres"];
      const litros = (Math.random() * 30 + 15).toFixed(1);
      const precioLitro = 22.5 + Math.random() * 2;
      const monto = (litros * precioLitro).toFixed(2);
      setVoucher({
        attached: true,
        litros,
        monto,
        estacion: estaciones[Math.floor(Math.random() * estaciones.length)],
        fecha: new Date().toISOString().slice(0, 16),
      });
      setProcessing(false);
      toast("Ticket leído por OCR (simulado). Verifica los datos antes de guardar.");
    }, 1300);
  };

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
      <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5"><ScanLine size={14} className="text-teal-600" /> Voucher de combustible (OCR)</p>
      {!voucher.attached ? (
        <button type="button" onClick={handleFile} disabled={processing} className="w-full border-2 border-dashed border-slate-300 rounded-lg py-4 text-xs text-slate-500 flex flex-col items-center gap-1.5 hover:border-teal-400 hover:text-teal-600 transition">
          {processing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          {processing ? "Extrayendo datos del ticket..." : "Adjuntar foto del ticket / voucher"}
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-400">Litros cargados</label>
            <input className={`${inputCls} text-xs`} value={voucher.litros} onChange={(e) => setVoucher({ ...voucher, litros: e.target.value })} />
          </div>
          <div>
            <label className="text-[10px] text-slate-400">Monto total ($)</label>
            <input className={`${inputCls} text-xs`} value={voucher.monto} onChange={(e) => setVoucher({ ...voucher, monto: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] text-slate-400">Estación de servicio</label>
            <input className={`${inputCls} text-xs`} value={voucher.estacion} onChange={(e) => setVoucher({ ...voucher, estacion: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] text-slate-400">Fecha y hora del ticket</label>
            <input type="datetime-local" className={`${inputCls} text-xs`} value={voucher.fecha} onChange={(e) => setVoucher({ ...voucher, fecha: e.target.value })} />
          </div>
          <button type="button" onClick={() => setVoucher({ attached: false })} className="col-span-2 text-[11px] text-rose-500 mt-1 text-left">Quitar voucher</button>
        </div>
      )}
    </div>
  );
}

function BitacoraView({ vehicles, currentUser, addBitacora, toast, preselectVehicleId, offlineQueue, setOfflineQueue }) {
  const [tipo, setTipo] = useState("salida");
  const [vehicleId, setVehicleId] = useState(preselectVehicleId || vehicles[0]?.id || "");
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
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const set = () => setOnline(navigator.onLine);
    window.addEventListener("online", set);
    window.addEventListener("offline", set);
    return () => { window.removeEventListener("online", set); window.removeEventListener("offline", set); };
  }, []);

  const vehicle = vehicles.find((v) => v.id === vehicleId);

  const submit = (e) => {
    e.preventDefault();
    if (!conformidad) return toast("Debes aceptar la declaración de conformidad.", "error");
    if (!firma) return toast("Captura tu firma digital antes de continuar.", "error");

    const record = {
      id: uid("bit"), vehicleId, userId: currentUser.id, tipo,
      proyecto, destino, autorizadoPor,
      kmInicial: Number(kmInicial) || vehicle?.km || 0,
      kmFinal: tipo === "regreso" ? Number(kmFinal) || 0 : null,
      combustibleSalida, combustibleRegreso: tipo === "regreso" ? combustibleRegreso : null,
      limpieza, incidencias, danios, voucher,
      firmaDataUrl: firma,
      gps: null,
      timestamp: new Date().toISOString(),
    };

    const finalize = (coords) => {
      const snapshot = { ...record, gps: coords, hash: simpleHash(JSON.stringify(record) + Date.now()) };
      if (!navigator.onLine) {
        setOfflineQueue((q) => [...q, snapshot]);
        toast("Sin conexión: bitácora guardada localmente. Se sincronizará al recuperar señal.", "warn");
      } else {
        addBitacora(snapshot);
        toast("Bitácora registrada y auditada correctamente.");
      }
      setDanios([]); setFirma(null); setConformidad(false); setIncidencias(""); setVoucher({ attached: false });
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => finalize({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => finalize({ lat: 25.4260, lng: -100.3005 }),
        { timeout: 3000 }
      );
    } else {
      finalize({ lat: 25.4260, lng: -100.3005 });
    }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bitácora Diaria de Uso</h1>
          <p className="text-sm text-slate-500">Checklist de check-in / check-out del vehículo.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border ${online ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-amber-600 bg-amber-50 border-amber-200"}`}>
            {online ? <Wifi size={12} /> : <WifiOff size={12} />} {online ? "En línea" : "Sin conexión"}
          </span>
          {offlineQueue.length > 0 && (
            <button
              onClick={() => { offlineQueue.forEach(addBitacora); setOfflineQueue([]); toast(`${offlineQueue.length} bitácora(s) sincronizada(s).`); }}
              className="text-[11px] font-semibold text-teal-600 bg-teal-50 border border-teal-200 rounded-lg px-2.5 py-1.5"
            >
              Sincronizar ({offlineQueue.length})
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex gap-2 mb-5">
          <button onClick={() => setTipo("salida")} className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${tipo === "salida" ? "bg-[#090d16] text-white" : "bg-slate-100 text-slate-500"}`}>Check-out / Salida</button>
          <button onClick={() => setTipo("regreso")} className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${tipo === "regreso" ? "bg-[#090d16] text-white" : "bg-slate-100 text-slate-500"}`}>Check-in / Regreso</button>
        </div>

        <form onSubmit={submit}>
          <div className="grid md:grid-cols-2 gap-x-4">
            <Field label="Vehículo" required>
              <select className={inputCls} value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.brand} {v.model} — {v.plate}</option>)}
              </select>
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
            <Field label={tipo === "salida" ? "Combustible al salir" : "Combustible al salir (referencia)"}>
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

          <div className="mb-5">
            <p className="text-xs font-semibold text-slate-600 mb-2">Mapa de desperfectos</p>
            <DamageMap damages={danios} onChange={setDanios} />
          </div>

          <div className="mb-5">
            <VoucherOCR voucher={voucher} setVoucher={setVoucher} toast={toast} />
          </div>

          <div className="mb-5">
            <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5"><PenTool size={14} className="text-teal-600" /> Firma digital</p>
            <SignaturePad onChange={setFirma} />
          </div>

          <label className="flex items-start gap-2 text-xs text-slate-600 mb-5 bg-slate-50 rounded-lg p-3 border border-slate-100">
            <input type="checkbox" className="accent-teal-600 mt-0.5" checked={conformidad} onChange={(e) => setConformidad(e.target.checked)} />
            Declaro que la información capturada es verídica y refleja el estado real del vehículo al momento del registro. Entiendo que este registro quedará almacenado de forma inmutable para fines de auditoría.
          </label>

          <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-3 text-sm font-bold flex items-center justify-center gap-2">
            <Save size={15} /> Guardar bitácora
          </button>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   VEHICULO QR LANDING
============================================================ */
function VehiculoLanding({ vehicle, reservations, users, navigate, role }) {
  if (!vehicle) {
    return <div className="p-10 text-center text-slate-400">Vehículo no encontrado.</div>;
  }
  const activeRes = reservations.find((r) => r.vehicleId === vehicle.id && todayISO() >= r.start && todayISO() <= r.end);
  const user = activeRes ? users.find((u) => u.id === activeRes.userId) : null;

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <img src={vehicle.photo} className="w-full h-44 object-cover" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-slate-900">{vehicle.brand} {vehicle.model}</h2>
            <Badge status={vehicle.status} />
          </div>
          <p className="text-sm font-mono text-slate-500 mb-4">{vehicle.plate}</p>

          {vehicle.status === "disponible" && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <p className="text-sm font-semibold text-emerald-700 mb-3">🟢 Unidad libre y disponible</p>
              <button onClick={() => navigate("bitacora")} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2.5 text-sm font-bold">Iniciar Viaje / Check-out</button>
            </div>
          )}
          {vehicle.status === "en_uso" && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-blue-700 mb-2">🔵 En uso actualmente</p>
              <p className="text-xs text-blue-600">Colaborador: <strong>{user?.name || "No disponible"}</strong></p>
              <p className="text-xs text-blue-600">Entrega estimada: <strong>{activeRes ? fmtDate(activeRes.end) : "—"}</strong></p>
            </div>
          )}
          {vehicle.status === "mantenimiento" && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center">
              <p className="text-sm font-semibold text-rose-700 mb-1">🔴 En mantenimiento</p>
              <p className="text-xs text-rose-600">Unidad inhabilitada temporalmente por servicio de taller.</p>
            </div>
          )}
          {vehicle.status === "reservado" && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-sm font-semibold text-amber-700">🟡 Reservado</p>
              <p className="text-xs text-amber-600 mt-1">Esta unidad tiene una reserva próxima o activa.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MANTENIMIENTOS
============================================================ */
function MaintenanceModal({ open, onClose, vehicles, onSave, editing }) {
  const [form, setForm] = useState({ vehicleId: vehicles[0]?.id || "", tipo: "Preventivo", taller: "", descripcion: "", costo: "", estado: "Programado", fecha: todayISO() });
  useEffect(() => { if (open) setForm(editing || { vehicleId: vehicles[0]?.id || "", tipo: "Preventivo", taller: "", descripcion: "", costo: "", estado: "Programado", fecha: todayISO() }); }, [open, editing]);

  const submit = (e) => {
    e.preventDefault();
    onSave({ ...form, id: form.id || uid("mnt"), costo: Number(form.costo) || 0 });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Editar Mantenimiento" : "Nuevo Mantenimiento"} icon={<Wrench size={16} className="text-teal-600" />}>
      <form onSubmit={submit}>
        <Field label="Vehículo" required>
          <select className={inputCls} value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.brand} {v.model} — {v.plate}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <select className={inputCls} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option>Preventivo</option><option>Correctivo</option>
            </select>
          </Field>
          <Field label="Estado">
            <select className={inputCls} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              <option>Programado</option><option>En proceso</option><option>Completado</option>
            </select>
          </Field>
        </div>
        <Field label="Taller / Proveedor">
          <input className={inputCls} value={form.taller} onChange={(e) => setForm({ ...form, taller: e.target.value })} required />
        </Field>
        <Field label="Descripción">
          <textarea className={inputCls} rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Costo ($)">
            <input type="number" className={inputCls} value={form.costo} onChange={(e) => setForm({ ...form, costo: e.target.value })} />
          </Field>
          <Field label="Fecha">
            <input type="date" className={inputCls} value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </Field>
        </div>
        <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold mt-2">Guardar</button>
      </form>
    </Modal>
  );
}

function MantenimientosView({ vehicles, maintenance, setMaintenance, toast }) {
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterVehicle, setFilterVehicle] = useState("");

  const save = (m) => {
    setMaintenance((prev) => (prev.some((x) => x.id === m.id) ? prev.map((x) => (x.id === m.id ? m : x)) : [m, ...prev]));
    toast(editing ? "Mantenimiento actualizado." : "Mantenimiento registrado.");
    setEditing(null);
  };
  const remove = (id) => { setMaintenance((prev) => prev.filter((x) => x.id !== id)); toast("Mantenimiento eliminado."); };

  const filtered = maintenance.filter((m) => !filterVehicle || m.vehicleId === filterVehicle);

  const exportar = () => {
    const rows = filtered.map((m) => {
      const v = vehicles.find((x) => x.id === m.vehicleId);
      return { Placa: v?.plate, Vehiculo: `${v?.brand} ${v?.model}`, Tipo: m.tipo, Taller: m.taller, Descripcion: m.descripcion, Costo: m.costo, Estado: m.estado, Fecha: m.fecha };
    });
    exportToExcel(rows, "Historico_Mantenimientos_DrivePulse.xlsx", "Mantenimientos");
    toast("Reporte de mantenimientos exportado.");
  };

  const estadoColor = { Programado: "bg-slate-100 text-slate-600", "En proceso": "bg-amber-50 text-amber-700", Completado: "bg-emerald-50 text-emerald-700" };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Mantenimientos</h1>
          <p className="text-sm text-slate-500">Histórico global y programación de servicio.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportar} className="flex items-center gap-1.5 text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50"><Download size={14} /> Exportar a Excel</button>
          <button onClick={() => { setEditing(null); setModal(true); }} className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg px-3 py-2"><Plus size={14} /> Nuevo</button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <select className={`${inputCls} w-56 text-xs`} value={filterVehicle} onChange={(e) => setFilterVehicle(e.target.value)}>
          <option value="">Todos los vehículos</option>
          {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase text-slate-400">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Vehículo</th>
              <th className="text-left px-4 py-3 font-semibold">Tipo</th>
              <th className="text-left px-4 py-3 font-semibold">Taller</th>
              <th className="text-left px-4 py-3 font-semibold">Costo</th>
              <th className="text-left px-4 py-3 font-semibold">Estado</th>
              <th className="text-left px-4 py-3 font-semibold">Fecha</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const v = vehicles.find((x) => x.id === m.vehicleId);
              return (
                <tr key={m.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3"><p className="font-medium text-slate-700">{v?.brand} {v?.model}</p><p className="text-[11px] text-slate-400 font-mono">{v?.plate}</p></td>
                  <td className="px-4 py-3 text-slate-600">{m.tipo}</td>
                  <td className="px-4 py-3 text-slate-600">{m.taller}</td>
                  <td className="px-4 py-3 text-slate-600 font-semibold">${Number(m.costo).toLocaleString()}</td>
                  <td className="px-4 py-3"><span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${estadoColor[m.estado]}`}>{m.estado}</span></td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(m.fecha)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setEditing(m); setModal(true); }} className="text-slate-400 hover:text-teal-600 mr-2"><Edit2 size={14} /></button>
                    <button onClick={() => remove(m.id)} className="text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 py-8 text-sm">Sin registros.</td></tr>}
          </tbody>
        </table>
      </div>

      <MaintenanceModal open={modal} onClose={() => setModal(false)} vehicles={vehicles} onSave={save} editing={editing} />
    </div>
  );
}

/* ============================================================
   INSPECCIONES MENSUALES
============================================================ */
function InspeccionesView({ vehicles, inspections, setInspections, toast }) {
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id || "");
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const [docs, setDocs] = useState({ circulacion: true, seguro: true, verificacion: true, licencia: true });
  const [equipo, setEquipo] = useState(Object.fromEntries(SAFETY_EQUIPMENT.map((e) => [e, true])));
  const [matriz, setMatriz] = useState(Object.fromEntries(CONDITION_MATRIX_ITEMS.map((i) => [i, "Bueno"])));
  const [observaciones, setObservaciones] = useState("");

  const submit = (e) => {
    e.preventDefault();
    setInspections((prev) => [{ id: uid("insp"), vehicleId, docs, equipo, matriz, observaciones, km: vehicle?.km, fecha: new Date().toISOString() }, ...prev]);
    toast("Inspección mensual registrada correctamente.");
    setObservaciones("");
  };

  return (
    <div className="grid xl:grid-cols-[1fr_360px] gap-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Inspección Mensual y Auditoría</h1>
        <p className="text-sm text-slate-500 mb-5">Verificación formal de Recursos Humanos.</p>
        <form onSubmit={submit}>
          <Field label="Vehículo a inspeccionar" required>
            <select className={inputCls} value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.brand} {v.model} — {v.plate}</option>)}
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
                    <button type="button" key={v} onClick={() => setMatriz({ ...matriz, [item]: v })} className={`text-[10px] font-semibold px-2 py-1 rounded-md border transition ${
                      matriz[item] === v
                        ? v === "Bueno" ? "bg-emerald-500 text-white border-emerald-500" : v === "Regular" ? "bg-amber-500 text-white border-amber-500" : "bg-rose-500 text-white border-rose-500"
                        : "border-slate-200 text-slate-400"
                    }`}>{v}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Field label="Observaciones generales">
            <textarea className={inputCls} rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </Field>

          <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-3 text-sm font-bold flex items-center justify-center gap-2"><ShieldCheck size={15} /> Registrar inspección</button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 h-fit">
        <h3 className="font-semibold text-slate-800 text-sm mb-4">Historial reciente</h3>
        <div className="space-y-3">
          {inspections.slice(0, 6).map((insp) => {
            const v = vehicles.find((x) => x.id === insp.vehicleId);
            const malos = Object.values(insp.matriz).filter((x) => x === "Malo").length;
            return (
              <div key={insp.id} className="border border-slate-100 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-slate-700">{v?.plate}</p>
                  <span className="text-[10px] text-slate-400">{fmtDate(insp.fecha.slice(0, 10))}</span>
                </div>
                <p className="text-[11px] text-slate-500">{malos > 0 ? `${malos} punto(s) en condición Mala` : "Condición general adecuada"}</p>
              </div>
            );
          })}
          {inspections.length === 0 && <p className="text-xs text-slate-400">Aún no hay inspecciones registradas.</p>}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   HISTÓRICO DE BITÁCORAS + CAJA NEGRA
============================================================ */
function AuditViewerModal({ open, onClose, record, vehicles, users }) {
  if (!record) return null;
  const v = vehicles.find((x) => x.id === record.vehicleId);
  const u = users.find((x) => x.id === record.userId);
  return (
    <Modal open={open} onClose={onClose} title="Caja Negra Vehicular — Registro Inmutable" icon={<ShieldCheck size={16} className="text-teal-600" />} width="max-w-2xl">
      <div className="grid md:grid-cols-2 gap-4 mb-4 text-xs">
        <div className="bg-slate-50 rounded-lg p-3"><p className="text-slate-400">Vehículo</p><p className="font-semibold text-slate-700">{v?.brand} {v?.model} — {v?.plate}</p></div>
        <div className="bg-slate-50 rounded-lg p-3"><p className="text-slate-400">Colaborador</p><p className="font-semibold text-slate-700">{u?.name || record.userId}</p></div>
        <div className="bg-slate-50 rounded-lg p-3"><p className="text-slate-400">Timestamp del servidor</p><p className="font-semibold text-slate-700">{fmtDateTime(record.timestamp)}</p></div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-slate-400">Coordenadas GPS</p>
          {record.gps ? (
            <a target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${record.gps.lat},${record.gps.lng}`} className="font-semibold text-teal-600 flex items-center gap-1 hover:underline">
              <MapPin size={12} /> {record.gps.lat.toFixed(5)}, {record.gps.lng.toFixed(5)} <ExternalLink size={11} />
            </a>
          ) : <p className="text-slate-400">No capturado</p>}
        </div>
      </div>

      {record.firmaDataUrl && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-500 mb-1">Firma digital capturada</p>
          <img src={record.firmaDataUrl} className="border border-slate-200 rounded-lg bg-white h-24 object-contain" />
        </div>
      )}

      <div className="mb-4">
        <p className="text-xs font-semibold text-slate-500 mb-1">Hash de integridad</p>
        <p className="font-mono text-[11px] bg-slate-900 text-teal-300 rounded-lg px-3 py-2 break-all">{record.hash}</p>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 mb-1">Snapshot JSONB completo (auditoria_logs)</p>
        <pre className="bg-slate-900 text-slate-200 text-[10px] rounded-lg p-3 overflow-x-auto max-h-64">{JSON.stringify(record, null, 2)}</pre>
      </div>
    </Modal>
  );
}

function HistoricoBitacoras({ bitacoras, vehicles, users, toast }) {
  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [viewing, setViewing] = useState(null);

  const filtered = bitacoras.filter((b) => (!filterVehicle || b.vehicleId === filterVehicle) && (!filterUser || b.userId === filterUser));

  const exportar = () => {
    const rows = filtered.map((b) => {
      const v = vehicles.find((x) => x.id === b.vehicleId);
      const u = users.find((x) => x.id === b.userId);
      return {
        Fecha: fmtDateTime(b.timestamp), Vehiculo: `${v?.brand} ${v?.model}`, Placa: v?.plate, Colaborador: u?.name,
        Proyecto: b.proyecto, Destino: b.destino, KM_Inicial: b.kmInicial, KM_Final: b.kmFinal,
        Combustible_Salida: b.combustibleSalida, Combustible_Regreso: b.combustibleRegreso, Incidencias: b.incidencias,
      };
    });
    exportToExcel(rows, "Historico_Bitacoras_DrivePulse.xlsx", "Bitacoras");
    toast("Histórico de bitácoras exportado.");
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><ShieldCheck size={15} className="text-teal-600" /> Histórico de Bitácoras · Caja Negra</h3>
        <button onClick={exportar} className="flex items-center gap-1.5 text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50"><Download size={14} /> Exportar a Excel</button>
      </div>
      <div className="flex gap-2 mb-4">
        <select className={`${inputCls} w-52 text-xs`} value={filterVehicle} onChange={(e) => setFilterVehicle(e.target.value)}>
          <option value="">Todos los vehículos</option>
          {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate}</option>)}
        </select>
        <select className={`${inputCls} w-52 text-xs`} value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
          <option value="">Todos los colaboradores</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase text-slate-400">
            <tr>
              <th className="text-left px-3 py-2 font-semibold">Fecha</th>
              <th className="text-left px-3 py-2 font-semibold">Vehículo</th>
              <th className="text-left px-3 py-2 font-semibold">Colaborador</th>
              <th className="text-left px-3 py-2 font-semibold">Proyecto</th>
              <th className="text-left px-3 py-2 font-semibold">KM Recorridos</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => {
              const v = vehicles.find((x) => x.id === b.vehicleId);
              const u = users.find((x) => x.id === b.userId);
              return (
                <tr key={b.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                  <td className="px-3 py-2.5 text-slate-500">{fmtDateTime(b.timestamp)}</td>
                  <td className="px-3 py-2.5 font-medium text-slate-700">{v?.plate}</td>
                  <td className="px-3 py-2.5 text-slate-600">{u?.name}</td>
                  <td className="px-3 py-2.5 text-slate-600">{b.proyecto}</td>
                  <td className="px-3 py-2.5 text-slate-600">{b.kmFinal ? b.kmFinal - b.kmInicial : "—"}</td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => setViewing(b)} className="text-teal-600 text-[11px] font-semibold hover:underline flex items-center gap-1 ml-auto"><Eye size={12} /> Ver Caja Negra</button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400 py-8 text-sm">Sin registros.</td></tr>}
          </tbody>
        </table>
      </div>
      <AuditViewerModal open={!!viewing} onClose={() => setViewing(null)} record={viewing} vehicles={vehicles} users={users} />
    </div>
  );
}

/* ============================================================
   CONFIGURACIÓN
============================================================ */
function InviteUserModal({ open, onClose, onInvite }) {
  const [form, setForm] = useState({ name: "", email: "", role: "trabajador", area: "" });
  const submit = (e) => {
    e.preventDefault();
    onInvite({ ...form, id: uid("u"), status: "invitado", password: "" });
    setForm({ name: "", email: "", role: "trabajador", area: "" });
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Invitar colaborador" icon={<UserPlus size={16} className="text-teal-600" />}>
      <form onSubmit={submit}>
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
        <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold mt-2 flex items-center justify-center gap-2"><Mail size={14} /> Enviar invitación</button>
      </form>
    </Modal>
  );
}

function ConfiguracionView({ branding, setBranding, users, setUsers, toast, goSetPasswordAs }) {
  const [tab, setTab] = useState("branding");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [localBranding, setLocalBranding] = useState(branding);

  const saveBranding = () => { setBranding(localBranding); toast("Configuración de marca actualizada."); };

  const invite = (u) => { setUsers((prev) => [...prev, u]); toast(`Invitación enviada a ${u.email}.`); };
  const removeUser = (id) => { setUsers((prev) => prev.filter((u) => u.id !== id)); toast("Colaborador eliminado."); };
  const changeRole = (id, role) => setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
  const resetPassword = (id) => { setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: "invitado", password: "" } : u))); toast("Contraseña restablecida. El usuario deberá crear una nueva."); };

  const fileToDataUrl = (file, cb) => {
    const reader = new FileReader();
    reader.onload = () => cb(reader.result);
    reader.readAsDataURL(file);
  };

  const tabs = [
    { key: "branding", label: "Marca y Login" },
    { key: "lightning", label: "Botón Rápido" },
    { key: "usuarios", label: "Usuarios" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Configuración</h1>
        <p className="text-sm text-slate-500">Administra el branding, accesos rápidos y usuarios de la plataforma.</p>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`text-xs font-semibold px-4 py-2 rounded-lg transition ${tab === t.key ? "bg-white shadow text-slate-800" : "text-slate-500"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "branding" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm mb-3">Identidad de marca</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Nombre comercial">
                <input className={inputCls} value={localBranding.name} onChange={(e) => setLocalBranding({ ...localBranding, name: e.target.value })} />
              </Field>
              <Field label="Logotipo oficial">
                <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && fileToDataUrl(e.target.files[0], (url) => setLocalBranding({ ...localBranding, logoUrl: url }))} className="text-xs" />
              </Field>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm mb-3">Pantalla de inicio de sesión</h3>
            <Field label="Título de bienvenida">
              <input className={inputCls} value={localBranding.loginTitle} onChange={(e) => setLocalBranding({ ...localBranding, loginTitle: e.target.value })} />
            </Field>
            <Field label="Banner / imagen de fondo">
              <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && fileToDataUrl(e.target.files[0], (url) => setLocalBranding({ ...localBranding, loginBanner: url }))} className="text-xs" />
            </Field>
            <Field label="Aviso legal de pie de página">
              <input className={inputCls} value={localBranding.footerText} onChange={(e) => setLocalBranding({ ...localBranding, footerText: e.target.value })} />
            </Field>
          </div>
          <button onClick={saveBranding} className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-5 py-2.5 text-sm font-semibold flex items-center gap-2"><Save size={14} /> Guardar cambios</button>
        </div>
      )}

      {tab === "lightning" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 text-sm mb-1 flex items-center gap-2"><Zap size={15} className="text-teal-600" /> Configuración del botón rápido</h3>
          <p className="text-xs text-slate-500 mb-4">Define qué acción ejecuta el ícono de rayo en la barra lateral.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { v: "a", label: "Nueva Reserva Rápida", icon: Calendar },
              { v: "b", label: "Check-in / Out Inmediato", icon: ClipboardList },
              { v: "c", label: "Escanear QR", icon: QrCode },
              { v: "d", label: "Ocultar ícono", icon: EyeOff },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setLocalBranding({ ...localBranding, lightningAction: opt.v })}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${localBranding.lightningAction === opt.v ? "border-teal-400 bg-teal-50" : "border-slate-200 hover:bg-slate-50"}`}
              >
                <opt.icon size={18} className={localBranding.lightningAction === opt.v ? "text-teal-600" : "text-slate-400"} />
                <span className="text-sm font-medium text-slate-700">{opt.label}</span>
              </button>
            ))}
          </div>
          <button onClick={saveBranding} className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-5 py-2.5 text-sm font-semibold flex items-center gap-2 mt-5"><Save size={14} /> Guardar cambios</button>
        </div>
      )}

      {tab === "usuarios" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-sm">Gestión de usuarios</h3>
            <button onClick={() => setInviteOpen(true)} className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg px-3 py-2"><UserPlus size={14} /> Invitar colaborador</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-400">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Nombre</th>
                  <th className="text-left px-3 py-2 font-semibold">Correo</th>
                  <th className="text-left px-3 py-2 font-semibold">Rol</th>
                  <th className="text-left px-3 py-2 font-semibold">Estatus</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-slate-50">
                    <td className="px-3 py-2.5 font-medium text-slate-700">{u.name}</td>
                    <td className="px-3 py-2.5 text-slate-500">{u.email}</td>
                    <td className="px-3 py-2.5">
                      <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1">
                        <option value="trabajador">Trabajador</option>
                        <option value="administrador">Administrador</option>
                      </select>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${u.status === "activo" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {u.status === "activo" ? "Activo" : "Invitación pendiente"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      {u.status === "invitado" && (
                        <button onClick={() => goSetPasswordAs(u)} className="text-teal-600 text-[11px] font-semibold hover:underline mr-3">Simular enlace</button>
                      )}
                      {u.status === "activo" && (
                        <button onClick={() => resetPassword(u.id)} className="text-slate-400 text-[11px] font-semibold hover:text-amber-600 mr-3">Restablecer contraseña</button>
                      )}
                      <button onClick={() => removeUser(u.id)} className="text-slate-400 hover:text-rose-600"><Trash2 size={13} className="inline" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <InviteUserModal open={inviteOpen} onClose={() => setInviteOpen(false)} onInvite={invite} />
    </div>
  );
}

/* ============================================================
   MAIN APP
============================================================ */
const ADMIN_ONLY_VIEWS = ["dashboard", "mantenimientos", "inspecciones", "configuracion"];

export default function DrivePulseApp() {
  const [branding, setBranding] = useState({
    name: "DrivePulse",
    logoUrl: null,
    loginTitle: "Bienvenido a DrivePulse",
    loginBanner: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=1200&auto=format&fit=crop",
    footerText: "© Energía Secing — DrivePulse. Uso interno exclusivo del personal autorizado.",
    lightningAction: "a",
  });

  const [users, setUsers] = useState(INIT_USERS);
  const [vehicles, setVehicles] = useState(INIT_VEHICLES);
  const [reservations, setReservations] = useState(buildInitReservations());
  const [bitacoras, setBitacoras] = useState(buildInitBitacoras());
  const [maintenance, setMaintenance] = useState(INIT_MAINTENANCE);
  const [inspections, setInspections] = useState([]);
  const [offlineQueue, setOfflineQueue] = useState([]);

  const [authStatus, setAuthStatus] = useState("login"); // login | set-password | app
  const [currentUser, setCurrentUser] = useState(null);
  const [invitedUser, setInvitedUser] = useState(null);

  const [view, setView] = useState("reservas");
  const [selectedVehicleId, setSelectedVehicleId] = useState(INIT_VEHICLES[0].id);
  const [weekOffset, setWeekOffset] = useState(0);

  const [toasts, setToasts] = useState([]);
  const toast = useCallback((msg, type = "success") => {
    const id = uid("toast");
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  const removeToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const [reservationModal, setReservationModal] = useState(false);
  const [reservationDefaultVehicle, setReservationDefaultVehicle] = useState(null);

  document.title = branding.name + " · Energía Secing";

  const navigate = useCallback((target) => {
    if (currentUser?.role === "trabajador" && ADMIN_ONLY_VIEWS.includes(target)) {
      toast("No tienes permisos para acceder a esa sección.", "error");
      setView("reservas");
      return;
    }
    setView(target);
  }, [currentUser, toast]);

  const handleLogin = (u) => {
    setCurrentUser(u);
    setAuthStatus("app");
    setView(u.role === "administrador" ? "dashboard" : "reservas");
    toast(`Bienvenido, ${u.name.split(" ")[0]}.`);
  };

  const goSetPassword = (token, forUser) => {
    setInvitedUser(forUser || null);
    setAuthStatus("set-password");
  };

  const goSetPasswordAsUser = (u) => {
    setInvitedUser(u);
    setAuthStatus("set-password");
  };

  const completeSetPassword = (password) => {
    if (invitedUser) {
      const updated = { ...invitedUser, password, status: "activo" };
      setUsers((prev) => prev.map((u) => (u.id === invitedUser.id ? updated : u)));
      toast("¡Contraseña creada con éxito!");
      setCurrentUser(updated);
      setAuthStatus("app");
      setView(updated.role === "administrador" ? "dashboard" : "reservas");
    } else {
      toast("¡Contraseña creada con éxito!");
      setAuthStatus("login");
    }
    setInvitedUser(null);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthStatus("login");
    setView("reservas");
  };

  const addBitacora = (record) => {
    setBitacoras((prev) => [record, ...prev]);
    setVehicles((prev) => prev.map((v) => (v.id === record.vehicleId ? { ...v, km: record.kmFinal || v.km, fuel: record.combustibleRegreso || record.combustibleSalida || v.fuel, status: record.tipo === "salida" ? "en_uso" : "disponible" } : v)));
  };

  const openNewReservation = (vehicleId) => {
    setReservationDefaultVehicle(vehicleId || selectedVehicleId);
    setReservationModal(true);
  };

  const handleLightning = () => {
    const a = branding.lightningAction;
    if (a === "a") { openNewReservation(); }
    else if (a === "b") { navigate("bitacora"); }
    else if (a === "c") { navigate("vehiculo"); }
    else { toast("El botón rápido está deshabilitado en la configuración actual.", "warn"); }
  };

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  if (authStatus === "login") {
    return (
      <>
        <Toasts toasts={toasts} remove={removeToast} />
        <LoginScreen branding={branding} users={users} onLogin={handleLogin} goSetPassword={goSetPassword} />
      </>
    );
  }

  if (authStatus === "set-password") {
    return (
      <>
        <Toasts toasts={toasts} remove={removeToast} />
        <SetPasswordScreen branding={branding} invitedUser={invitedUser} onComplete={completeSetPassword} />
      </>
    );
  }

  const role = currentUser.role;
  const showFleetPanel = view !== "configuracion";

  return (
    <div className="h-screen w-full flex bg-[#f8fafc] overflow-hidden text-slate-800" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        ::-webkit-scrollbar{width:8px;height:8px}
        ::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:8px}
      `}</style>
      <Toasts toasts={toasts} remove={removeToast} />

      <Sidebar branding={branding} view={view} navigate={navigate} role={role} onLogout={handleLogout} currentUser={currentUser} onLightning={branding.lightningAction !== "d" ? handleLightning : null} />

      {showFleetPanel && (
        <FleetPanel vehicles={vehicles} selectedId={selectedVehicleId} onSelect={(id) => { setSelectedVehicleId(id); if (view !== "reservas" && view !== "bitacora" && view !== "vehiculo") navigate("reservas"); }} onNewReservation={() => openNewReservation()} />
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          {view === "dashboard" && role === "administrador" && (
            <div className="space-y-6">
              <Dashboard vehicles={vehicles} bitacoras={bitacoras} maintenance={maintenance} />
            </div>
          )}

          {view === "reservas" && (
            <div className="space-y-6">
              {selectedVehicle && <VehicleBanner vehicle={selectedVehicle} />}
              <ReservasView
                vehicles={vehicles} users={users} reservations={reservations} setReservations={setReservations}
                role={role} toast={toast} openNewReservation={openNewReservation}
                weekOffset={weekOffset} setWeekOffset={setWeekOffset}
              />
            </div>
          )}

          {view === "bitacora" && (
            <div className="space-y-6">
              {selectedVehicle && <VehicleBanner vehicle={selectedVehicle} />}
              <BitacoraView vehicles={vehicles} currentUser={currentUser} addBitacora={addBitacora} toast={toast} preselectVehicleId={selectedVehicleId} offlineQueue={offlineQueue} setOfflineQueue={setOfflineQueue} />
              {role === "administrador" && <HistoricoBitacoras bitacoras={bitacoras} vehicles={vehicles} users={users} toast={toast} />}
            </div>
          )}

          {view === "vehiculo" && (
            <VehiculoLanding vehicle={selectedVehicle} reservations={reservations} users={users} navigate={navigate} role={role} />
          )}

          {view === "mantenimientos" && role === "administrador" && (
            <MantenimientosView vehicles={vehicles} maintenance={maintenance} setMaintenance={setMaintenance} toast={toast} />
          )}

          {view === "inspecciones" && role === "administrador" && (
            <InspeccionesView vehicles={vehicles} inspections={inspections} setInspections={setInspections} toast={toast} />
          )}

          {view === "configuracion" && role === "administrador" && (
            <ConfiguracionView branding={branding} setBranding={setBranding} users={users} setUsers={setUsers} toast={toast} goSetPasswordAs={goSetPasswordAsUser} />
          )}

          {selectedVehicle && (view === "reservas" || view === "bitacora") && (
            <div className="mt-6 flex items-center justify-center">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-5">
                <FauxQR seed={selectedVehicle.id} size={110} />
                <div>
                  <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1"><QrCode size={13} /> Código QR de acceso rápido</p>
                  <p className="text-[11px] text-slate-400 max-w-xs">Coloca este código en el tablero del vehículo. Al escanearlo se abre la landing con el estatus en tiempo real.</p>
                  <button onClick={() => navigate("vehiculo")} className="mt-2 text-[11px] font-semibold text-teal-600 hover:underline">Ver landing del vehículo →</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <NewReservationModal
        open={reservationModal} onClose={() => setReservationModal(false)}
        vehicles={vehicles} users={users} defaultVehicleId={reservationDefaultVehicle}
        onCreate={(r) => { setReservations((prev) => [...prev, r]); setVehicles((prev) => prev.map((v) => (v.id === r.vehicleId ? { ...v, status: "reservado" } : v))); toast("Reserva creada correctamente."); }}
      />
    </div>
  );
}
