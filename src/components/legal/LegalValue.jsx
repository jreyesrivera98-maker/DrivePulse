import { LEGAL, isPlaceholder } from "../../config/legal";

/**
 * Muestra un dato de LEGAL. Si todavía es un marcador "[...]" lo resalta en
 * ámbar; si es un correo real, lo vuelve un enlace mailto.
 */
export function LegalValue({ field }) {
  const value = LEGAL[field];
  if (isPlaceholder(value)) {
    return (
      <span className="rounded bg-amber-100 px-1 font-medium text-amber-900" title="Dato pendiente de configurar en src/config/legal.js">
        {value}
      </span>
    );
  }
  if (field === "correoPrivacidad") {
    return (
      <a href={`mailto:${value}`} className="font-medium text-teal-700 underline underline-offset-2">
        {value}
      </a>
    );
  }
  return <span className="font-medium text-slate-800">{value}</span>;
}

/**
 * Reemplaza tokens {{campo}} dentro de un texto plano por <LegalValue/>.
 * Útil para el contenido de las preguntas frecuentes (que vive como datos).
 */
export function withLegalValues(text) {
  return text.split(/(\{\{\w+\}\})/g).map((part, i) => {
    const m = part.match(/^\{\{(\w+)\}\}$/);
    return m ? <LegalValue key={i} field={m[1]} /> : part;
  });
}
