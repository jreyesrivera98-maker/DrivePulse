/**
 * Datos legales del aviso de privacidad.
 *
 * ⚠️  COMPLETAR ANTES DE PUBLICAR. Los valores entre corchetes son
 * marcadores: mientras existan, el aviso los resalta en ámbar y muestra un
 * recordatorio visible, para que no se publique por descuido con datos
 * ficticios. Revisa el texto completo con tu asesor legal.
 *
 * El responsable es la persona moral que decide sobre el tratamiento de los
 * datos (normalmente la empresa que opera la flotilla). DrivePulse es la
 * plataforma tecnológica que utiliza.
 */
export const LEGAL = {
  plataforma: "DrivePulse",
  desarrollador: "Energía Secing",
  responsable: "[Razón social del responsable]",
  domicilio: "[Domicilio completo del responsable]",
  correoPrivacidad: "[correo de privacidad]",
  plazoConservacion: "[plazo de conservación]",
  version: "1.0",
  ultimaActualizacion: "1 de octubre de 2026",
};

const isPlaceholder = (v) => typeof v === "string" && /^\[.*\]$/.test(v.trim());

/** Campos que aún son marcadores. Vacío = configuración completa. */
export const PENDING_LEGAL_FIELDS = Object.entries(LEGAL)
  .filter(([, v]) => isPlaceholder(v))
  .map(([k]) => k);

export const legalIncomplete = PENDING_LEGAL_FIELDS.length > 0;
export { isPlaceholder };
