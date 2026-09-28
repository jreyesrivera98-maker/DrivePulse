import { useState } from "react";
import { Building2, Loader2, AlertTriangle, ArrowRight } from "lucide-react";
import { createOrganization, signOut } from "../lib/supabaseClient";
import { useBranding } from "../hooks/useBranding";
import PulseMark from "../components/ui/PulseMark";
import { Field, inputCls } from "../components/ui/formPrimitives";

/**
 * Se muestra cuando hay una sesión activa pero profiles.organization_id
 * sigue en null — es decir, alguien que se acaba de auto-registrar y
 * todavía no tiene empresa. Tiene prioridad sobre cualquier otra
 * pantalla, igual que /set-password.
 */
export default function CreateOrganization({ profile, reloadProfile, onDone }) {
  const { branding } = useBranding();
  const [orgName, setOrgName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!orgName.trim()) {
      setError("El nombre de tu empresa es obligatorio.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createOrganization(orgName.trim(), profile?.name);
      await reloadProfile();
      onDone();
    } catch (err) {
      setError(err.message || "No se pudo crear tu organización. Intenta de nuevo.");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-dp-black flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-sm relative z-10">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <PulseMark size={34} logoUrl={branding.logo_url} />
          <span className="text-white font-bold text-lg">{branding.name}</span>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
            <Building2 size={20} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Crea tu empresa</h2>
          <p className="text-sm text-slate-500 mb-6">
            Hola{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}. Ya casi — dinos cómo se llama tu empresa
            para terminar de configurar tu cuenta como administrador.
          </p>

          <form onSubmit={submit}>
            <Field label="Nombre de la empresa" required>
              <input className={inputCls} value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Ej. Transportes García" autoFocus />
            </Field>

            {error && (
              <div className="mb-4 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            <button type="submit" disabled={saving} className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {saving ? "Configurando..." : "Crear empresa y continuar"}
            </button>
          </form>

          <button onClick={() => signOut()} className="w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-5">
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
