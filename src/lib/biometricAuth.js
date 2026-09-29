/**
 * Autenticación biométrica nativa (WebAuthn / Passkeys).
 *
 * Reemplaza a la firma gráfica: en lugar de un dibujo, el usuario
 * confirma su identidad con la huella / rostro / PIN del propio
 * dispositivo (`userVerification: "required"`).
 *
 * Flujo:
 *   - Si el usuario ya registró una passkey en este dispositivo
 *     (credentialId guardado en localStorage) → `navigator.credentials.get()`.
 *   - Si es la primera vez → `navigator.credentials.create()` (registra una
 *     passkey de plataforma; la ceremonia de registro ya exige verificación
 *     de usuario, así que cuenta como autenticación).
 *
 * El `challenge` NO es aleatorio a ciegas: es el SHA-256 de un contexto
 * del cierre (usuario, vehículo, KM, timestamp, nonce). Así la firma
 * WebAuthn queda amarrada criptográficamente a ESTE cierre y no se puede
 * reutilizar en otro. La evidencia se devuelve para guardarse en la caja
 * negra y poder verificarse del lado del servidor más adelante.
 *
 * @typedef {"unsupported" | "cancelled" | "blocked" | "failed"} BiometricErrorCode
 *
 * @typedef {Object} BiometricEvidence
 * @property {"asercion" | "registro"} ceremonia
 * @property {string} credential_id       base64url
 * @property {string} client_data_json    base64url
 * @property {string} [authenticator_data] base64url (solo en aserción)
 * @property {string} [signature]          base64url (solo en aserción)
 * @property {string} [public_key]         base64url SPKI (solo en registro)
 * @property {string} challenge            base64url (SHA-256 del contexto)
 * @property {string} nonce                base64url
 */

export class BiometricError extends Error {
  /** @param {BiometricErrorCode} code @param {string} message */
  constructor(code, message) {
    super(message);
    this.name = "BiometricError";
    this.code = code;
  }
}

const credentialStorageKey = (userId) => `drivepulse:passkey:${userId}`;

/* ---------- utilidades base64url ---------- */

export function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlToBuffer(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function readStoredCredentialId(userId) {
  try {
    return localStorage.getItem(credentialStorageKey(userId));
  } catch {
    return null; // modo privado / storage bloqueado
  }
}

function storeCredentialId(userId, credentialId) {
  try {
    localStorage.setItem(credentialStorageKey(userId), credentialId);
  } catch {
    /* no crítico: la próxima vez simplemente se vuelve a registrar */
  }
}

/* ---------- detección de soporte ---------- */

/**
 * ¿Este dispositivo/navegador puede hacer verificación biométrica de
 * plataforma? Requiere contexto seguro (HTTPS o localhost).
 */
export async function isBiometricAvailable() {
  if (typeof window === "undefined") return false;
  if (!window.isSecureContext || !window.PublicKeyCredential || !navigator.credentials) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

async function sha256(text) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
}

/** Traduce un DOMException de WebAuthn a un BiometricError accionable. */
function mapWebAuthnError(err) {
  if (err instanceof BiometricError) return err;
  switch (err?.name) {
    // El usuario cerró el diálogo, no pasó la huella/rostro, o se agotó el tiempo.
    // (WebAuthn no permite distinguir estos casos a propósito, por privacidad.)
    case "NotAllowedError":
    case "AbortError":
      return new BiometricError("cancelled", "La verificación biométrica fue cancelada o no se completó.");
    // El navegador/política del sitio lo bloquea o el dispositivo no lo soporta.
    case "SecurityError":
    case "NotSupportedError":
    case "InvalidStateError":
    case "ConstraintError":
      return new BiometricError("blocked", "Tu navegador o dispositivo no permite la verificación biométrica.");
    default:
      return new BiometricError("failed", err?.message || "Error inesperado en la verificación biométrica.");
  }
}

/**
 * Pide la verificación biométrica del dispositivo.
 *
 * @param {Object} params
 * @param {string} params.userId       uuid del perfil (también identifica la passkey local)
 * @param {string} params.userName     nombre para mostrar en el diálogo del sistema
 * @param {Object} params.context      datos del cierre que se amarran al challenge
 * @returns {Promise<BiometricEvidence>}
 * @throws {BiometricError}
 */
export async function authenticateBiometric({ userId, userName, context }) {
  if (!(await isBiometricAvailable())) {
    throw new BiometricError("unsupported", "Este dispositivo no soporta autenticación biométrica.");
  }

  const nonceBytes = crypto.getRandomValues(new Uint8Array(16));
  const nonce = bufferToBase64Url(nonceBytes);
  const challenge = await sha256(JSON.stringify({ ...context, user_id: userId, nonce }));
  const challengeB64 = bufferToBase64Url(challenge);

  try {
    const storedId = readStoredCredentialId(userId);

    if (storedId) {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60_000,
          userVerification: "required",
          allowCredentials: [{ type: "public-key", id: base64UrlToBuffer(storedId), transports: ["internal"] }],
        },
      });
      if (!assertion) throw new BiometricError("failed", "El dispositivo no devolvió ninguna credencial.");

      return {
        ceremonia: "asercion",
        credential_id: bufferToBase64Url(assertion.rawId),
        client_data_json: bufferToBase64Url(assertion.response.clientDataJSON),
        authenticator_data: bufferToBase64Url(assertion.response.authenticatorData),
        signature: bufferToBase64Url(assertion.response.signature),
        challenge: challengeB64,
        nonce,
      };
    }

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "DrivePulse" }, // `id` se omite: el navegador usa el dominio actual
        user: {
          id: new TextEncoder().encode(userId),
          name: userName || userId,
          displayName: userName || userId,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }, // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        timeout: 60_000,
        attestation: "none",
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
      },
    });
    if (!credential) throw new BiometricError("failed", "El dispositivo no devolvió ninguna credencial.");

    const credentialId = bufferToBase64Url(credential.rawId);
    storeCredentialId(userId, credentialId);
    const publicKey = credential.response.getPublicKey?.();

    return {
      ceremonia: "registro",
      credential_id: credentialId,
      client_data_json: bufferToBase64Url(credential.response.clientDataJSON),
      public_key: publicKey ? bufferToBase64Url(publicKey) : undefined,
      challenge: challengeB64,
      nonce,
    };
  } catch (err) {
    throw mapWebAuthnError(err);
  }
}
