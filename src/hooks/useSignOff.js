import { useState, useCallback } from "react";
import { authenticateBiometric } from "../lib/biometricAuth";
import { captureGps, getGpsPermissionState, buildCajaNegra } from "../lib/cajaNegra";

/**
 * Orquesta el "Autenticar y Firmar" de un check-in / check-out:
 *
 *   1. Timestamp del sistema (no editable por el usuario).
 *   2. GPS (obligatorio), según el estado del permiso:
 *        - "granted": se arranca YA en paralelo a la huella (sin prompt extra)
 *          para no sumar la espera del GPS a la de la biometría.
 *        - "denied": se intenta igualmente una vez (falla al instante si de
 *          verdad está denegado, y evita abortar por un falso positivo de la
 *          Permissions API) ANTES de pedir la huella.
 *        - "prompt"/desconocido: se pide después de la huella.
 *   3. Biometría nativa (WebAuthn). Se lanza pegada al tap del usuario porque
 *      los navegadores (Safari) exigen ese gesto para abrir la ceremonia.
 *   4. Se espera el resultado del GPS.
 *   5. Devuelve la caja negra ya congelada, lista para el RPC de Supabase.
 *
 * Fallback "Auditoría Ciega":
 *   - Dispositivo sin biometría / navegador que la bloquea → se continúa
 *     automáticamente en modo ciego (queda registrado el motivo).
 *   - El usuario cancela el diálogo biométrico → NO se cae solo a ciego
 *     (sería trivial saltarse la biometría cancelando). Se le avisa y se
 *     habilita una opción explícita "continuar sin biometría".
 *
 * Etapas para los spinners del botón: "idle" | "auth" | "gps" | "saving".
 *
 * @param {{ toast: (msg: string, type?: string) => void }} deps
 */
export function useSignOff({ toast }) {
  const [stage, setStage] = useState("idle");
  const [biometricCancelled, setBiometricCancelled] = useState(false);

  const reset = useCallback(() => setStage("idle"), []);
  const markSaving = useCallback(() => setStage("saving"), []);

  /**
   * @param {Object} params
   * @param {string} params.userId
   * @param {string} [params.userName]
   * @param {Object} params.context     datos del cierre (vehículo, KM, etc.) que se amarran al challenge
   * @param {boolean} [params.forceBlind] el usuario eligió continuar sin biometría
   * @returns {Promise<import("../lib/cajaNegra").CajaNegra | null>} null si se abortó (ya se mostró toast)
   */
  const collect = useCallback(
    async ({ userId, userName, context, forceBlind = false }) => {
      setStage("auth");
      let ok = false;
      const timestampCierre = new Date().toISOString();

      try {
        const permiso = await getGpsPermissionState();
        let gpsPromise = null;
        if (permiso === "denied") {
          // Confirma con una lectura real: si de verdad está denegado lanza GpsError ya.
          const gps = await captureGps();
          gpsPromise = Promise.resolve(gps);
        } else if (permiso === "granted") {
          gpsPromise = captureGps();
          gpsPromise.catch(() => {}); // evita "unhandled rejection" si la huella se cancela antes
        }

        let webauthn = null;
        let motivoFallback = null;

        if (forceBlind) {
          motivoFallback = "cancelado_por_usuario";
        } else {
          try {
            webauthn = await authenticateBiometric({
              userId,
              userName,
              context: { ...context, timestamp_cierre: timestampCierre },
            });
            setBiometricCancelled(false);
          } catch (err) {
            if (err.code === "cancelled") {
              setBiometricCancelled(true);
              toast("No se completó la verificación biométrica. Inténtalo de nuevo.", "error");
              return null;
            }
            // unsupported | blocked | failed → auditoría ciega automática
            motivoFallback = err.code || "failed";
            if (err.code === "failed") console.warn("[useSignOff] WebAuthn falló:", err);
            toast("Tu dispositivo no permite biometría: el cierre se registrará con Auditoría Ciega.", "warn");
          }
        }

        setStage("gps");
        const gps = await (gpsPromise ?? captureGps());

        const cajaNegra = buildCajaNegra({ timestampCierre, gps, webauthn, motivoFallback });
        ok = true;
        return cajaNegra;
      } catch (err) {
        // GpsError u otro imprevisto: el mensaje ya es amigable.
        console.warn("[useSignOff] cierre abortado:", err?.code, err?.detail ?? err?.message);
        toast(err.message || "No se pudo completar la autenticación.", "error");
        return null;
      } finally {
        // En éxito NO se vuelve a "idle": el formulario llama markSaving() y,
        // al terminar el envío, reset(). Solo se libera aquí si se abortó.
        if (!ok) setStage("idle");
      }
    },
    [toast]
  );

  return { stage, busy: stage !== "idle", biometricCancelled, collect, markSaving, reset };
}
