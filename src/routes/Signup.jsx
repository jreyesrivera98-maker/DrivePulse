import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Building2, User, Eye, EyeOff, ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import { signUp } from "../lib/supabaseClient";
import { useBranding } from "../hooks/useBranding";
import PulseMark from "../components/ui/PulseMark";
import { Field, inputCls, PasswordStrength } from "../components/ui/formPrimitives";

/**
 * Alta de una empresa nueva en DrivePulse (self-service). Distinto
 * del flujo de invitación: aquí nadie invita a nadie, es la puerta
 * de entrada pública para un cliente nuevo del SaaS.
 *
 * Solo crea la cuenta de Auth — la organización en sí se termina de
 * crear en App.jsx (pantalla "Crear tu empresa") justo después de
 * que la sesión ya está activa, vía create_organization().
 */
export default function Signup() {
  const { branding } = useBranding();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim());
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "No se pudo crear tu cuenta. Intenta de nuevo.");
    } finally {
      setLoading(false);
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
          <h2 className="text-xl font-bold text-slate-900 mb-1">Crea tu cuenta</h2>
          <p className="text-sm text-slate-500 mb-6">
            El siguiente paso te va a pedir el nombre de tu empresa — esto solo crea tu acceso.
          </p>

          <form onSubmit={submit}>
            <Field label="Tu nombre" required>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className={`${inputCls} pl-9`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo" required />
              </div>
            </Field>
            <Field label="Correo electrónico" required>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className={`${inputCls} pl-9`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@empresa.com" required />
              </div>
            </Field>
            <Field label="Contraseña" required>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className={`${inputCls} pl-9 pr-9`}
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <PasswordStrength value={password} />
            </Field>

            {error && (
              <div className="mb-4 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {loading ? "Creando cuenta..." : "Continuar"}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-5">
            ¿Ya tienes cuenta? <Link to="/login" className="text-teal-600 font-medium hover:underline">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
