import { useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, ShieldCheck } from "lucide-react";
import PulseMark from "../ui/PulseMark";
import { DEFAULT_BRANDING } from "../../hooks/useBranding";
import { LEGAL } from "../../config/legal";

const tabClass = ({ isActive }) =>
  `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
    isActive ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
  }`;

/**
 * Marco de las páginas informativas (aviso de privacidad y preguntas
 * frecuentes). Es público: se puede abrir sin sesión (desde el login o el
 * registro) y con sesión (desde la barra superior).
 */
export default function LegalLayout({ title, description, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  // "default" = esta fue la primera pantalla de la sesión (p. ej. abierta en una pestaña nueva).
  const canGoBack = location.key !== "default";

  useEffect(() => {
    const previous = document.title;
    document.title = `${title} · ${DEFAULT_BRANDING.name}`;
    return () => {
      document.title = previous;
    };
  }, [title]);

  // react-router no desplaza a las anclas (#seccion) al navegar dentro de la SPA.
  useEffect(() => {
    const id = decodeURIComponent(location.hash.replace("#", ""));
    if (!id) return;
    const raf = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(raf);
  }, [location.hash, location.pathname]);

  return (
    <div className="min-h-screen bg-dp-surface text-slate-700">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-dp-black">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <button
            type="button"
            onClick={() => (canGoBack ? navigate(-1) : navigate("/"))}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          >
            <ArrowLeft size={15} /> {canGoBack ? "Volver" : "Inicio"}
          </button>

          <div className="ml-1 hidden items-center gap-2 sm:flex">
            <PulseMark size={24} />
            <span className="text-sm font-bold text-white">{DEFAULT_BRANDING.name}</span>
          </div>

          <nav className="ml-auto flex items-center gap-1" aria-label="Información legal y ayuda">
            <NavLink to="/privacidad" className={tabClass}>
              <ShieldCheck size={14} /> Privacidad
            </NavLink>
            <NavLink to="/preguntas-frecuentes" className={tabClass}>
              <HelpCircle size={14} /> Preguntas
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:pt-12">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-slate-500">{description}</p>}
        <div className="mt-8">{children}</div>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        {LEGAL.plataforma} · versión {LEGAL.version} · actualizado el {LEGAL.ultimaActualizacion}
      </footer>
    </div>
  );
}
