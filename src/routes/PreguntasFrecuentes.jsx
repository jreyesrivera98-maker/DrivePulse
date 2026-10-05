import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Search, SearchX, ShieldCheck } from "lucide-react";
import LegalLayout from "../components/legal/LegalLayout";
import { withLegalValues } from "../components/legal/LegalValue";
import { FAQ_CATEGORIES, FAQ_ITEMS } from "../content/faq";

// Búsqueda sin acentos ni mayúsculas: "ubicacion" encuentra "ubicación".
const normalize = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const SEARCHABLE = FAQ_ITEMS.map((item) => ({
  id: item.id,
  text: normalize([item.q, ...item.a, ...(item.steps ?? [])].join(" ")),
}));

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 ${
        active ? "border-teal-600 bg-teal-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

function FaqItem({ item, open, onToggle }) {
  const panelId = `faq-panel-${item.id}`;
  return (
    <div id={item.id} className="scroll-mt-20 border-b border-slate-200 last:border-b-0">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-start justify-between gap-4 px-1 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        >
          <span className="text-[15px] font-semibold leading-snug text-slate-900">{item.q}</span>
          <ChevronDown size={18} className={`mt-0.5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </h3>
      <div id={panelId} role="region" aria-labelledby={item.id} hidden={!open} className="max-w-[68ch] space-y-3 px-1 pb-5">
        {item.a.map((p, i) => (
          <p key={i} className="text-[15px] leading-7 text-slate-600">
            {withLegalValues(p)}
          </p>
        ))}
        {item.steps && (
          <ol className="space-y-2 pl-5 text-[15px] leading-7 text-slate-600 [&>li]:list-decimal [&>li]:marker:font-semibold [&>li]:marker:text-slate-400">
            {item.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        )}
        {item.link && (
          <Link to={item.link.to} className="inline-block text-sm font-medium text-teal-700 underline underline-offset-2">
            {item.link.label}
          </Link>
        )}
      </div>
    </div>
  );
}

export default function PreguntasFrecuentes() {
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("todas");
  const [open, setOpen] = useState(() => new Set());

  // Enlaces directos: /preguntas-frecuentes#ubicacion-permiso abre y muestra esa pregunta.
  useEffect(() => {
    const id = decodeURIComponent(location.hash.replace("#", ""));
    if (!id || !FAQ_ITEMS.some((i) => i.id === id)) return;
    setCategory("todas");
    setQuery("");
    setOpen((prev) => new Set(prev).add(id));
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
  }, [location.hash]);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    return FAQ_ITEMS.filter((item) => {
      if (category !== "todas" && item.category !== category) return false;
      return !q || SEARCHABLE.find((s) => s.id === item.id).text.includes(q);
    });
  }, [query, category]);

  const toggle = (id) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const searching = query.trim().length > 0;

  return (
    <LegalLayout title="Preguntas frecuentes" description="Respuestas sobre la firma con biometría, la ubicación y el uso de tus datos al cerrar un viaje.">
      <div className="max-w-3xl">
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca por palabra, por ejemplo “huella” o “ubicación”"
            aria-label="Buscar en las preguntas frecuentes"
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-[15px] text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          />
        </div>

        <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filtrar por tema">
          <Chip active={category === "todas"} onClick={() => setCategory("todas")}>Todas</Chip>
          {FAQ_CATEGORIES.map((c) => (
            <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
              {c.label}
            </Chip>
          ))}
        </div>

        <p className="mt-5 text-xs text-slate-400" aria-live="polite">
          {results.length} {results.length === 1 ? "pregunta" : "preguntas"}
          {searching ? " encontradas" : ""}
        </p>

        {results.length > 0 ? (
          <div className="mt-2 rounded-2xl border border-slate-200 bg-white px-4 sm:px-6">
            {results.map((item) => (
              <FaqItem key={item.id} item={item} open={open.has(item.id)} onToggle={() => toggle(item.id)} />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <SearchX size={26} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">No encontramos preguntas con “{query.trim()}”</p>
            <p className="mt-1 text-sm text-slate-500">Prueba con otra palabra o quita el filtro de tema.</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("todas");
              }}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            >
              Ver todas las preguntas
            </button>
          </div>
        )}

        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-teal-600" />
          <div className="text-sm leading-relaxed text-slate-600">
            <p className="font-semibold text-slate-800">¿Sigues con dudas?</p>
            <p className="mt-1">
              Consulta el{" "}
              <Link to="/privacidad" className="font-medium text-teal-700 underline underline-offset-2">
                aviso de privacidad
              </Link>{" "}
              completo o pregunta a tu administrador.
            </p>
          </div>
        </div>
      </div>
    </LegalLayout>
  );
}
