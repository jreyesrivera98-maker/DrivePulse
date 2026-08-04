import { LogOut } from "lucide-react";
import { signOut } from "../../lib/supabaseClient";
import AlertsPanel from "./AlertsPanel";
import PulseMark from "../ui/PulseMark";

export default function TopBar({ profile, branding }) {
  return (
    <div className="h-14 shrink-0 border-b border-slate-200 bg-white flex items-center justify-between px-4">
      <div className="flex items-center gap-2 md:hidden">
        <PulseMark size={26} logoUrl={branding.logo_url} />
        <span className="font-bold text-sm text-slate-800">{branding.name}</span>
      </div>
      <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
        <span className="font-semibold text-slate-700">{profile?.name}</span>
        <span className="w-1 h-1 rounded-full bg-slate-300" />
        <span className="capitalize">{profile?.role}</span>
      </div>
      <div className="flex items-center gap-1.5 ml-auto">
        <AlertsPanel />
        <button
          onClick={() => signOut()}
          className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
          title="Cerrar sesión"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}
