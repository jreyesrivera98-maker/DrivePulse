import { LogOut } from "lucide-react";
import { signOut } from "../../lib/supabaseClient";
import PulseMark from "../ui/PulseMark";

/**
 * Shell provisional para las rutas que todavía no se migran del
 * prototipo (Reservas, Bitácora, Mantenimientos, etc.). Ya resuelve
 * sesión real y logout; el sidebar completo de 3 columnas del
 * prototipo se conecta aquí en la siguiente etapa de migración.
 */
export default function Shell({ profile, branding, children }) {
  return (
    <div className="h-screen w-full flex bg-dp-surface overflow-hidden">
      <div className="w-[76px] shrink-0 bg-dp-black flex flex-col items-center py-5 gap-4">
        <PulseMark size={38} logoUrl={branding?.logo_url} />
        <div className="flex-1" />
        <div
          className="w-9 h-9 rounded-full bg-slate-700 text-white text-xs font-bold flex items-center justify-center"
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
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
