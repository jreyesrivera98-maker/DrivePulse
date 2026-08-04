import { useState } from "react";
import { MapPin, ExternalLink, Copy, Check, Loader2, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useGpsIntegration } from "../hooks/useGpsIntegration";

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="flex items-center gap-1.5 text-[11px] font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50">
      {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
      {copied ? "Copiado" : label}
    </button>
  );
}

export default function Gps() {
  const { settings, loading } = useGpsIntegration();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24 text-slate-400 gap-2">
        <Loader2 size={18} className="animate-spin" /> Cargando…
      </div>
    );
  }

  if (!settings.enabled) {
    return (
      <div className="max-w-md mx-auto py-20 text-center px-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
          <MapPin size={22} />
        </div>
        <h2 className="font-bold text-slate-800 mb-1">Integración GPS no configurada</h2>
        <p className="text-sm text-slate-500 mb-4">Actívala y captura los accesos del portal desde Configuración.</p>
        <Link to="/configuracion" className="inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg px-4 py-2.5">
          <Settings size={14} /> Ir a Configuración
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-1.5"><MapPin size={16} className="text-teal-600" /> Rastreo GPS</h1>
          <p className="text-[11px] text-slate-400">{settings.portal_url}</p>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton value={settings.username} label="Copiar usuario" />
          <CopyButton value={settings.password} label="Copiar contraseña" />
          <a
            href={settings.portal_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold bg-dp-black hover:bg-[#161d30] text-white rounded-lg px-3 py-2"
          >
            <ExternalLink size={13} /> Abrir en pestaña nueva
          </a>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 px-4 py-1.5 bg-slate-50 border-b border-slate-100">
        Si el recuadro de abajo aparece en blanco, es porque el proveedor bloquea que su sitio se muestre dentro de
        otra página — usa "Abrir en pestaña nueva" arriba.
      </p>
      <iframe title="Portal GPS" src={settings.portal_url} className="flex-1 w-full border-0" />
    </div>
  );
}
