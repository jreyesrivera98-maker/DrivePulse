import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import { signIn } from "../lib/supabaseClient";
import { useBranding } from "../hooks/useBranding";
import PulseMark from "../components/ui/PulseMark";
import { Field, inputCls } from "../components/ui/formPrimitives";

export default function Login({ profile, session }) {
  const { branding } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Si ya hay sesión y perfil activo, no tiene caso quedarse en /login.
  useEffect(() => {
    if (session && profile) {
      const from = location.state?.from;
      const home = profile.role === "administrador" ? "/dashboard" : "/reservas";
      navigate(from || home, { replace: true });
    }
  }, [session, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // onAuthStateChange (useAuth) recarga sesión/perfil; el useEffect
      // de arriba se encarga de redirigir según el rol.
    } catch (err) {
      // Supabase da un mensaje genérico por seguridad (no distingue si
      // el correo no existe, la contraseña es incorrecta, o la cuenta
      // todavía no tiene contraseña por ser una invitación pendiente).
      setError(
        "No pudimos iniciar sesión. Verifica tu correo y contraseña, o revisa si tienes " +
          "una invitación pendiente por confirmar en tu correo."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-dp-black relative overflow-hidden">
      {/* Panel de marca (izquierda, solo desktop) */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] p-12 relative">
        {branding.login_banner_url && (
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{ backgroundImage: `url(${branding.login_banner_url})`, backgroundSize: "cover", backgroundPosition: "center" }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-dp-black via-[#0b1020]/90 to-[#0d1420]" />

        <div className="relative z-10 flex items-center gap-3">
          <PulseMark size={40} logoUrl={branding.logo_url} />
          <div>
            <p className="text-white font-bold text-lg tracking-tight">{branding.name}</p>
            <p className="text-teal-300/70 text-[11px] font-medium">by Energía Secing</p>
          </div>
        </div>

        <div className="relative z-10">
          <svg viewBox="0 0 400 100" className="w-full h-24 mb-6 opacity-90">
            <path
              d="M0 50 H80 L100 15 L130 85 L155 30 L175 50 H400"
              stroke="#2dd4bf"
              strokeWidth="2"
              fill="none"
              strokeDasharray="340"
              className="animate-pulseLine"
            />
          </svg>
          <h1 className="text-white text-4xl font-bold tracking-tight leading-tight mb-3">{branding.login_title}</h1>
          <p className="text-slate-400 text-sm max-w-sm">
            Control en tiempo real de reservas, bitácoras, mantenimientos e inspecciones de tu flotilla vehicular.
          </p>
        </div>

        <p className="relative z-10 text-slate-500 text-[11px]">{branding.footer_text}</p>
      </div>

      {/* Formulario (derecha) */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-950 lg:bg-dp-surface">
        <div className="w-full max-w-sm">
          <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <PulseMark size={34} logoUrl={branding.logo_url} />
            <span className="text-white font-bold text-lg">{branding.name}</span>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Inicia sesión</h2>
            <p className="text-sm text-slate-500 mb-6">Accede con tu correo corporativo asignado.</p>

            <form onSubmit={submit}>
              <Field label="Correo electrónico" required>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className={`${inputCls} pl-9`}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nombre@energiasecing.mx"
                    autoComplete="email"
                    required
                  />
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
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

              {error && (
                <div className="mb-4 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg px-3 py-2 flex items-center gap-2">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-dp-black hover:bg-[#131a2c] text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-60"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                {loading ? "Verificando..." : "Iniciar sesión"}
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400">
                El autorregistro está deshabilitado. Solo el administrador puede invitar colaboradores desde
                Configuración.
              </p>
            </div>
          </div>

          <p className="text-center text-[11px] text-slate-500 lg:text-slate-400 mt-6">{branding.footer_text}</p>
        </div>
      </div>
    </div>
  );
}
