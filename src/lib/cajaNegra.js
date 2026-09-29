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
  /**
   * @param {"denied" | "unavailable" | "timeout" | "unsupported" | "insecure"} code
   * @param {string} message
   * @param {string} [detail] mensaje crudo del navegador, solo para diagnóstico en consola
   */
  constructor(code, message, detail) {
    super(message);
    this.name = "GpsError";
    this.code = code;
    this.detail = detail;
  }
}

const GPS_MESSAGES = {
  // Ojo: iOS/Android devuelven "permiso denegado" también cuando la ubicación
  // está apagada a nivel de SISTEMA, aunque el sitio tenga permiso en el navegador.
  denied:
    "No pudimos acceder a tu ubicación. Revisa que esté permitida para este sitio en el navegador y que la Ubicación del dispositivo (Ajustes) esté activada; luego inténtalo de nuevo.",
  unavailable:
    "No pudimos determinar tu ubicación. Activa el GPS o el Wi-Fi del dispositivo, o acércate a una ventana, e inténtalo de nuevo.",
  timeout: "Tardamos demasiado en obtener tu ubicación. Acércate a una zona con mejor señal e inténtalo de nuevo.",
  unsupported: "Este dispositivo no permite obtener la ubicación, que es obligatoria para entregar el vehículo.",
  insecure: "La ubicación solo funciona en una conexión segura (HTTPS). Abre DrivePulse desde su dirección https://.",
};

/**
 * Estado del permiso de ubicación según la Permissions API, SIN disparar el
 * prompt. Es solo orientativo: la API no existe o miente en algunos
 * navegadores/webviews, así que nunca debe bloquear por sí sola.
 * @returns {Promise<"granted" | "denied" | "prompt" | "unknown">}
 */
export async function getGpsPermissionState() {
  try {
    const status = await navigator.permissions?.query({ name: "geolocation" });
    return status?.state ?? "unknown";
  } catch {
    return "unknown"; // Safari antiguo y otros: sin Permissions API para geolocation
  }
}

function getPosition(options) {
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options));
}

function toGpsError(err) {
  const code = err?.code === 1 ? "denied" : err?.code === 3 ? "timeout" : "unavailable";
  return new GpsError(code, GPS_MESSAGES[code], err?.message);
}

/**
 * Captura las coordenadas actuales. La ubicación es OBLIGATORIA: si no se
 * puede obtener, lanza GpsError (con mensaje amigable).
 *
 * Estrategia en dos intentos, porque un solo intento de "alta precisión"
 * falla con frecuencia en interiores y en navegadores de escritorio:
 *   1. Alta precisión (GPS), fix fresco, hasta 8 s.
 *   2. Si expira o no está disponible: precisión de red (Wi-Fi/celular),
 *      aceptando un fix de máx. 60 s de antigüedad, hasta 12 s.
 * Si el usuario deniega el permiso NO se reintenta. La precisión real
 * obtenida queda en `precision` y se guarda en la caja negra.
 *
 * @returns {Promise<{lat: number, lng: number, precision: number | null}>}
 */
export async function captureGps() {
  if (typeof window !== "undefined" && window.isSecureContext === false) {
    throw new GpsError("insecure", GPS_MESSAGES.insecure);
  }
  if (!navigator.geolocation) throw new GpsError("unsupported", GPS_MESSAGES.unsupported);

  let pos;
  try {
    pos = await getPosition({ enableHighAccuracy: true, timeout: 8_000, maximumAge: 0 });
  } catch (first) {
    if (first?.code === 1) throw toGpsError(first);
    try {
      pos = await getPosition({ enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 });
    } catch (second) {
      throw toGpsError(second);
    }
  }

  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    precision: Number.isFinite(pos.coords.accuracy) ? Math.round(pos.coords.accuracy) : null,
  };
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
