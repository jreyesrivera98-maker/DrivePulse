import { AlertTriangle } from "lucide-react";
import { signOut } from "../lib/supabaseClient";

export default function OrganizationSuspended({ organizationName }) {
  return (
    <div className="min-h-screen bg-dp-black flex items-center justify-center p-6">
      <div className="max-w-sm text-center bg-white rounded-2xl shadow-2xl p-8">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={22} />
        </div>
        <h1 className="text-lg font-bold text-slate-900 mb-1">Cuenta suspendida</h1>
        <p className="text-sm text-slate-500 mb-5">
          El acceso de <strong>{organizationName || "tu empresa"}</strong> a DrivePulse está temporalmente suspendido.
          Contacta a soporte para más información.
        </p>
        <button
          onClick={() => signOut()}
          className="inline-flex items-center gap-2 bg-dp-black hover:bg-[#161d30] text-white rounded-lg px-4 py-2.5 text-sm font-semibold"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
