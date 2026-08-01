import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Check, Loader2, AlertTriangle } from "lucide-react";
import { setNewPassword } from "../lib/supabaseClient";
import { useBranding } from "../hooks/useBranding";
import PulseMark from "../components/ui/PulseMark";
import { Field, inputCls, PasswordStrength } from "../components/ui/formPrimitives";

/**
 * Se monta cuando useAuth detecta passwordRecovery = true (evento
 * PASSWORD_RECOVERY de Supabase), sin importar qué ruta pidió el
 * navegador — así nunca hay una redirección prematura a /login
 * mientras el enlace de invitación/recuperación se está resolviendo.
 */
export default function SetPassword({ profile, reloadProfile, onDone }) {
  const { branding } = useBranding();
  const navigate = useNavigate();

  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (p1.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
    if (p1 !== p2) return setError("Las contraseñas no coinciden.");

    setSaving(true);
    try {
      await setNewPassword(p1);
      const updated = await reloadProfile();
      setSuccess(true);
      onDone();

      setTimeout(() => {
        const home = updated?.role === "administrador" ? "/dashboard" : "/reservas";
        navigate(home, { replace: true });
      }, 900);
    } catch (err) {
      setError(err.message || "No se pudo actualizar la contraseña. Intenta de nuevo.");
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
          {success ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <Check size={22} />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">¡Contraseña creada con éxito!</h2>
              <p className="text-sm text-slate-500">Redirigiendo a tu área asignada…</p>
            </div>
          ) : (
            <>
              <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
                <KeyRound size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Crea tu contraseña</h2>
              <p className="text-sm text-slate-500 mb-6">
                Hola{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}. Configura tus credenciales para acceder
                a {branding.name}.
              </p>

              <form onSubmit={submit}>
                <Field label="Nueva contraseña" required>
                  <input
                    className={inputCls}
                    type="password"
                    value={p1}
                    onChange={(e) => setP1(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                  />
                  <PasswordStrength value={p1} />
                </Field>
                <Field label="Confirmar contraseña" required>
                  <input
                    className={inputCls}
                    type="password"
                    value={p2}
                    onChange={(e) => setP2(e.target.value)}
                    placeholder="Repite tu contraseña"
                    autoComplete="new-password"
                  />
                </Field>

                {error && (
                  <div className="mb-4 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg px-3 py-2 flex items-center gap-2">
                    <AlertTriangle size={14} /> {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-60"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Crear contraseña
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
