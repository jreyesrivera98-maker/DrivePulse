import { useLegal } from "./LegalContext";

// Texto que se muestra mientras la organización no haya configurado el dato.
// Está redactado para leerse bien dentro de las frases donde se usa.
const FALLBACKS = {
  responsable: "la organización que te dio acceso a DrivePulse",
  domicilio: "el domicilio que te indique tu organización",
  correoPrivacidad: "tu administrador",
  plazoConservacion: "el tiempo que la ley exija",
};

/**
 * Muestra un dato legal configurado en Configuración › Privacidad.
 * Si aún no está configurado, muestra un texto genérico (sin marcadores).
 * El correo se vuelve un enlace mailto.
 */
export function LegalValue({ field }) {
  const { legal } = useLegal();
  const value = legal[field];
  if (!value) return <span>{FALLBACKS[field]}</span>;
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
