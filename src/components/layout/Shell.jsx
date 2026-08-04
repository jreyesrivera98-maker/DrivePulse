import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import FleetPanel from "./FleetPanel";
import TopBar from "./TopBar";
import MobileBottomNav from "./MobileBottomNav";

/**
 * Layout de 3 columnas (Sidebar + Panel de Flotilla + Área central)
 * en escritorio, y barra superior + navegación inferior en móvil.
 *
 * Regla de Oro de UX: en /configuracion el Panel de Flotilla se
 * oculta automáticamente para dar una vista limpia a pantalla
 * completa al administrador.
 */
export default function Shell({ profile, branding, children }) {
  const location = useLocation();
  const showFleetPanel = !location.pathname.startsWith("/configuracion");

  return (
    <div className="h-screen w-full flex bg-dp-surface overflow-hidden">
      <Sidebar profile={profile} branding={branding} />
      {showFleetPanel && <FleetPanel />}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar profile={profile} branding={branding} />
        <div className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</div>
      </div>
      <MobileBottomNav profile={profile} />
    </div>
  );
}
