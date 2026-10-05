/**
 * Datos legales ESTÁTICOS del producto (iguales para todas las organizaciones).
 *
 * Los datos del responsable (razón social, domicilio, correo de privacidad y
 * plazo de conservación) son de cada organización y se configuran desde
 * Configuración › Privacidad (ver hooks/useLegalSettings.js y la migración 0024).
 * Si cambia el texto del aviso, sube `version` y `ultimaActualizacion`.
 */
export const LEGAL = {
  plataforma: "DrivePulse",
  desarrollador: "Energía Secing",
  version: "1.0",
  ultimaActualizacion: "1 de octubre de 2026",
};
