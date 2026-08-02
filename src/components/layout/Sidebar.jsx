import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Calendar, ClipboardList, Wrench, ShieldCheck, Settings, Zap, LogOut } from "lucide-react";
import { signOut } from "../../lib/supabaseClient";
import { useSelectedVehicle } from "../../contexts/SelectedVehicleContext";
import PulseMark from "../ui/PulseMark";

const NAV_ADMIN = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/reservas", label: "Calendario", icon: Calendar },
  { path: "/bitacora", label: "Bitácora", icon: ClipboardList },
  { path: "/mantenimientos", label: "Mantenimientos", icon: Wrench },
  { path: "/inspecciones", label: "Inspecciones", icon: ShieldCheck },
  { path: "/configuracion", label: "Configuración", icon: Settings },
];

const NAV_WORKER = [
  { path: "/reservas", label: "Calendario", icon: Calendar },
  { path: "/bitacora", label: "Bitácora", icon: ClipboardList },
];

export default function Sidebar({ profile, branding }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedVehicleId, requestNewReservation } = useSelectedVehicle();

  const items = profile?.role === "administrador" ? NAV_ADMIN : NAV_WORKER;

  const handleLightning = () => {
    const action = branding.lightning_action;
    if (action === "a") {
      // Nueva Reserva Rápida: abre el modal (vía señal) y asegura estar en /reservas.
      requestNewReservation();
      if (location.pathname !== "/reservas") navigate("/reservas");
    } else if (action === "b") {
      // Check-in/Out Inmediato
      navigate("/bitacora");
    } else if (action === "c") {
      // Escanear QR: usa la unidad activa en el panel de flotilla, si hay una.
      navigate(selectedVehicleId ? `/vehiculo/${selectedVehicleId}` : "/reservas");
    }
    // action === "d" (Ocultar ícono): el botón ni siquiera se renderiza, ver abajo.
  };

  return (
    <div className="w-[76px] shrink-0 bg-dp-black flex flex-col items-center py-5 gap-1">
      <div className="mb-6">
        <PulseMark size={38} logoUrl={branding.logo_url} />
      </div>

      <div className="flex-1 flex flex-col gap-1.5 w-full items-center">
        {items.map((it) => {
          const Icon = it.icon;
          const active = location.pathname === it.path;
          return (
            <button
              key={it.path}
              onClick={() => navigate(it.path)}
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

      {branding.lightning_action !== "d" && (
        <button
          onClick={handleLightning}
          title="Acción rápida"
          className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/30 hover:scale-105 transition mb-3"
        >
          <Zap size={18} fill="white" />
        </button>
      )}

      <div
        className="w-9 h-9 rounded-full bg-slate-700 text-white text-xs font-bold flex items-center justify-center mb-2"
        title={profile?.name}
      >
        {profile?.name
          ?.split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")}
      </div>
      <button
        onClick={() => signOut()}
        title="Cerrar sesión"
        className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-white/5 transition"
      >
        <LogOut size={17} />
      </button>
    </div>
  );
}
