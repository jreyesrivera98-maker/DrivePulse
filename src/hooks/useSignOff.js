import { useState, useCallback } from "react";
import { authenticateBiometric } from "../lib/biometricAuth";
import { captureGps, isGpsPermissionDenied, buildCajaNegra } from "../lib/cajaNegra";

/**
 * Orquesta el "Autenticar y Firmar" de un check-in / check-out:
 *
 *   1. Timestamp del sistema (no editable por el usuario).
 *   2. Si el permiso de GPS ya está denegado → aborta ANTES de pedir la huella.
 *   3. Biometría nativa (WebAuthn). Se pide primero porque los navegadores
 *      exigen que la ceremonia arranque pegada al gesto del usuario (el tap).
 *   4. Ubicación GPS (obligatoria).
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
        if (await isGpsPermissionDenied()) {
          toast(
            "La ubicación está bloqueada en tu navegador. Actívala en los permisos del sitio: es obligatoria para entregar el vehículo.",
            "error"
          );
          return null;
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
        const gps = await captureGps();

        const cajaNegra = buildCajaNegra({ timestampCierre, gps, webauthn, motivoFallback });
        ok = true;
        return cajaNegra;
      } catch (err) {
        // GpsError u otro imprevisto: el mensaje ya es amigable.
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
