import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Calendar, ClipboardList, Fuel, MoreHorizontal, Wrench, ShieldCheck, FolderClock, MapPin, Settings } from "lucide-react";

const NAV_ADMIN = [
  { path: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { path: "/reservas", label: "Reservas", icon: Calendar },
  { path: "/bitacora", label: "Bitácora", icon: ClipboardList },
  { path: "/combustible", label: "Combustible", icon: Fuel },
];

const MORE_ADMIN = [
  { path: "/mantenimientos", label: "Mantenimientos", icon: Wrench },
  { path: "/inspecciones", label: "Inspecciones", icon: ShieldCheck },
  { path: "/historico", label: "Histórico", icon: FolderClock },
  { path: "/auditoria", label: "Auditoría", icon: ShieldCheck },
  { path: "/gps", label: "GPS", icon: MapPin },
  { path: "/configuracion", label: "Configuración", icon: Settings },
];

const NAV_WORKER = [
  { path: "/reservas", label: "Reservas", icon: Calendar },
  { path: "/bitacora", label: "Bitácora", icon: ClipboardList },
  { path: "/combustible", label: "Combustible", icon: Fuel },
];

export default function MobileBottomNav({ profile }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = profile?.role === "administrador";
  const items = isAdmin ? NAV_ADMIN : NAV_WORKER;
  const [moreOpen, setMoreOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40" ref={ref}>
      {moreOpen && (
        <div className="bg-white border-t border-slate-200 rounded-t-2xl shadow-2xl p-3 grid grid-cols-3 gap-2">
          {MORE_ADMIN.map((it) => {
            const Icon = it.icon;
            return (
              <button
                key={it.path}
                onClick={() => { navigate(it.path); setMoreOpen(false); }}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-slate-50 text-slate-600"
              >
                <Icon size={18} />
                <span className="text-[10px] font-medium">{it.label}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="h-16 bg-dp-black border-t border-white/10 flex items-stretch">
        {items.map((it) => {
          const Icon = it.icon;
          const active = location.pathname === it.path;
          return (
            <button
              key={it.path}
              onClick={() => { setMoreOpen(false); navigate(it.path); }}
              className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition ${active ? "text-teal-400" : "text-slate-500"}`}
            >
              <Icon size={18} />
              {it.label}
            </button>
          );
        })}
        {isAdmin && (
          <button
            onClick={() => setMoreOpen((o) => !o)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition ${moreOpen ? "text-teal-400" : "text-slate-500"}`}
          >
            <MoreHorizontal size={18} />
            Más
          </button>
        )}
      </div>
    </div>
  );
}
