/**
 * Auditoría ciega ("caja negra vehicular") del cierre de un viaje.
 *
 * Se arma en silencio justo antes de enviar a Supabase y se congela
 * (`Object.freeze`) para que ningún código posterior pueda alterarla.
 * En la base de datos el RPC la vuelve a validar y la copia dentro del
 * snapshot hasheado de `auditoria_logs` (tabla sin UPDATE/DELETE).
 *
 * @typedef {Object} CajaNegra
 * @property {string}  timestamp_cierre        ISO-8601, generado por el sistema (no editable por el usuario)
 * @property {true}    declaracion_jurada
 * @property {"biometrica" | "ciega"} metodo_firma
 * @property {string}  metodo_descripcion      "Biometría nativa (WebAuthn)" | "Checkbox + Auditoría Ciega"
 * @property {{lat: number, lng: number}} coordenadas_entrega
 * @property {number | null} precision_gps_m
 * @property {string | null} motivo_fallback   por qué no se usó biometría (solo si metodo_firma = "ciega")
 * @property {import("./biometricAuth").BiometricEvidence | null} webauthn
 */

export class GpsError extends Error {
  /** @param {"denied" | "unavailable" | "timeout" | "unsupported"} code @param {string} message */
  constructor(code, message) {
    super(message);
    this.name = "GpsError";
    this.code = code;
  }
}

const GPS_MESSAGES = {
  denied:
    "Necesitamos tu ubicación para registrar la entrega del vehículo. Activa el permiso de ubicación en tu navegador e inténtalo de nuevo.",
  unavailable: "No pudimos determinar tu ubicación. Revisa que el GPS esté activo e inténtalo de nuevo.",
  timeout: "Tardamos demasiado en obtener tu ubicación. Acércate a una zona con mejor señal e inténtalo de nuevo.",
  unsupported: "Este dispositivo no permite obtener la ubicación, que es obligatoria para entregar el vehículo.",
};

/**
 * Pregunta (sin disparar el prompt) si el permiso de ubicación ya está
 * denegado, para fallar rápido antes de pedir la huella.
 * @returns {Promise<boolean>}
 */
export async function isGpsPermissionDenied() {
  try {
    const status = await navigator.permissions?.query({ name: "geolocation" });
    return status?.state === "denied";
  } catch {
    return false; // Safari antiguo: no soporta Permissions API para geolocation
  }
}

/**
 * Captura las coordenadas actuales. La ubicación es OBLIGATORIA: si el
 * usuario la niega o falla, lanza GpsError (con mensaje amigable).
 * @returns {Promise<{lat: number, lng: number, precision: number | null}>}
 */
export function captureGps() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new GpsError("unsupported", GPS_MESSAGES.unsupported));

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          precision: Number.isFinite(pos.coords.accuracy) ? Math.round(pos.coords.accuracy) : null,
        }),
      (err) => {
        const code = err.code === 1 ? "denied" : err.code === 3 ? "timeout" : "unavailable";
        reject(new GpsError(code, GPS_MESSAGES[code]));
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
    );
  });
}

function deepFreeze(obj) {
  Object.values(obj).forEach((v) => {
    if (v && typeof v === "object") deepFreeze(v);
  });
  return Object.freeze(obj);
}

/**
 * Ensambla y congela la caja negra.
 * @param {Object} params
 * @param {string} params.timestampCierre
 * @param {{lat: number, lng: number, precision: number | null}} params.gps
 * @param {import("./biometricAuth").BiometricEvidence | null} params.webauthn  null = auditoría ciega
 * @param {string | null} [params.motivoFallback]
 * @returns {Readonly<CajaNegra>}
 */
export function buildCajaNegra({ timestampCierre, gps, webauthn, motivoFallback = null }) {
  const biometrica = Boolean(webauthn);
  return deepFreeze({
    timestamp_cierre: timestampCierre,
    declaracion_jurada: true,
    metodo_firma: biometrica ? "biometrica" : "ciega",
    metodo_descripcion: biometrica ? "Biometría nativa (WebAuthn)" : "Checkbox + Auditoría Ciega",
    coordenadas_entrega: { lat: gps.lat, lng: gps.lng },
    precision_gps_m: gps.precision,
    motivo_fallback: biometrica ? null : motivoFallback,
    webauthn: webauthn ?? null,
  });
}
