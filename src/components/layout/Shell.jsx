import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import FleetPanel from "./FleetPanel";

/**
 * Layout de 3 columnas: Sidebar (negro, navegación) + Panel de
 * Flotilla (320px) + Área central (el `children` de cada ruta).
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
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
