import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Calendar, ClipboardList, Fuel, Wrench, ShieldCheck,
  FolderClock, Settings, Zap, LogOut, Building2,
} from "lucide-react";
import { signOut } from "../../lib/supabaseClient";
import { useSelectedVehicle } from "../../contexts/SelectedVehicleContext";
import PulseMark from "../ui/PulseMark";

/**
 * Navegación agrupada por lo que realmente hace cada sección en el
 * día a día — no es solo una lista plana de rutas. En pantallas
 * grandes (xl+) el riel se ensancha y muestra el nombre de cada
 * sección junto al ícono, con los grupos separados; en pantallas
 * medianas se queda como el riel angosto de siempre.
 */
const GROUPS_ADMIN = [
  {
    label: "Operación",
    items: [
      { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { path: "/reservas", label: "Calendario", icon: Calendar },
      { path: "/bitacora", label: "Bitácora", icon: ClipboardList },
      { path: "/combustible", label: "Combustible", icon: Fuel },
    ],
  },
  {
    label: "Gestión",
    items: [
      { path: "/mantenimientos", label: "Mantenimientos", icon: Wrench },
      { path: "/inspecciones", label: "Inspecciones", icon: ShieldCheck },
      { path: "/historico", label: "Histórico", icon: FolderClock },
      { path: "/auditoria", label: "Auditoría", icon: ShieldCheck },
    ],
  },
  {
    label: "Sistema",
    items: [
      { path: "/configuracion", label: "Configuración", icon: Settings },
    ],
  },
];

const GROUPS_WORKER = [
  {
    label: null,
    items: [
      { path: "/reservas", label: "Calendario", icon: Calendar },
      { path: "/bitacora", label: "Bitácora", icon: ClipboardList },
      { path: "/combustible", label: "Combustible", icon: Fuel },
    ],
  },
];

export default function Sidebar({ profile, branding }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedVehicleId, requestNewReservation } = useSelectedVehicle();

  const groups = profile?.role === "administrador" ? GROUPS_ADMIN : GROUPS_WORKER;

  const handleLightning = () => {
    const action = branding.lightning_action;
    if (action === "a") {
      requestNewReservation();
      if (location.pathname !== "/reservas") navigate("/reservas");
    } else if (action === "b") {
      navigate("/bitacora");
    } else if (action === "c") {
      navigate(selectedVehicleId ? `/vehiculo/${selectedVehicleId}` : "/reservas");
    }
  };

  return (
    <div className="hidden md:flex w-[76px] xl:w-64 shrink-0 bg-dp-black flex-col py-5 transition-all duration-200">
      {/* Logo + línea de pulso decorativa (identidad de marca) */}
      <div className="px-4 mb-2 flex items-center gap-2.5 justify-center xl:justify-start">
        <PulseMark size={36} logoUrl={branding.logo_url} />
        <span className="hidden xl:block text-white font-bold text-sm tracking-tight truncate">{branding.name}</span>
      </div>
      <svg viewBox="0 0 240 20" className="hidden xl:block w-full h-4 px-4 mb-4 opacity-40" preserveAspectRatio="none">
        <path d="M0 10 H60 L75 3 L95 17 L112 8 L122 10 H240" stroke="#2dd4bf" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </svg>
      <div className="md:block xl:hidden mb-5" />

      {/* Navegación agrupada */}
      <div className="flex-1 flex flex-col gap-1 w-full overflow-y-auto px-2.5">
        {groups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-4" : ""}>
            {group.label && (
              <p className="hidden xl:block text-[10px] font-bold uppercase tracking-widest text-slate-600 px-2.5 mb-1.5">
                {group.label}
              </p>
            )}
            <div className="flex flex-col gap-1 items-center xl:items-stretch">
              {group.items.map((it) => {
                const Icon = it.icon;
                const active = location.pathname === it.path;
                return (
                  <button
                    key={it.path}
                    onClick={() => navigate(it.path)}
                    title={it.label}
                    className={`group relative flex items-center gap-2.5 rounded-xl transition-all
                      w-12 h-12 justify-center xl:w-full xl:h-auto xl:justify-start xl:px-2.5 xl:py-2
                      ${active ? "xl:bg-teal-500/10" : "hover:bg-white/5"}`}
                  >
                    {active && <span className="hidden xl:block absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-teal-400 rounded-r-full" />}
                    <span
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                        active ? "bg-teal-500 text-white shadow-md shadow-teal-500/30" : "text-slate-400 group-hover:text-slate-200 bg-white/[0.03]"
                      }`}
                    >
                      <Icon size={17} strokeWidth={2} />
                    </span>
                    <span className={`hidden xl:block text-[13px] font-medium truncate ${active ? "text-teal-300" : "text-slate-400 group-hover:text-slate-200"}`}>
                      {it.label}
                    </span>
                    <span className="pointer-events-none xl:hidden absolute left-16 z-50 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-[11px] text-white opacity-0 group-hover:opacity-100 transition shadow-lg">
                      {it.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Botón rápido */}
      {branding.lightning_action !== "d" && (
        <div className="px-2.5 mt-3">
          <button
            onClick={handleLightning}
            title="Acción rápida"
            className="w-full flex items-center justify-center xl:justify-start gap-2.5 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 text-white shadow-lg shadow-teal-500/30 hover:brightness-105 transition py-2.5 xl:px-3"
          >
            <Zap size={17} fill="white" />
            <span className="hidden xl:block text-[13px] font-semibold">Acción rápida</span>
          </button>
        </div>
      )}

      {/* Panel de Plataforma — solo visible para super-admins de DrivePulse, independiente del rol dentro de su empresa */}
      {profile?.is_platform_admin && (
        <div className="px-2.5 mt-2">
          <button
            onClick={() => navigate("/super-admin")}
            title="Panel de Plataforma"
            className="w-full flex items-center justify-center xl:justify-start gap-2.5 rounded-xl border border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition py-2 xl:px-2.5"
          >
            <Building2 size={16} />
            <span className="hidden xl:block text-[12px] font-medium">Panel de Plataforma</span>
          </button>
        </div>
      )}

      {/* Usuario + logout */}
      <div className="px-2.5 mt-3 pt-3 border-t border-white/5">
        <div className="flex items-center gap-2.5 xl:bg-white/[0.03] xl:rounded-xl xl:px-2.5 xl:py-2">
          <div className="w-9 h-9 rounded-full bg-slate-700 text-white text-xs font-bold flex items-center justify-center shrink-0 mx-auto xl:mx-0" title={profile?.name}>
            {profile?.name?.split(" ").map((n) => n[0]).slice(0, 2).join("")}
          </div>
          <div className="hidden xl:block min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{profile?.name}</p>
            <p className="text-[10px] text-slate-500 capitalize truncate">{profile?.role}</p>
          </div>
          <button
            onClick={() => signOut()}
            title="Cerrar sesión"
            className="hidden xl:flex w-7 h-7 rounded-lg items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-white/5 transition shrink-0"
          >
            <LogOut size={14} />
          </button>
        </div>
        <button
          onClick={() => signOut()}
          title="Cerrar sesión"
          className="xl:hidden w-full flex items-center justify-center rounded-xl py-2 mt-1 text-slate-500 hover:text-rose-400 hover:bg-white/5 transition"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}
