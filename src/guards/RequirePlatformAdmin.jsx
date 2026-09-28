import { Navigate } from "react-router-dom";

/**
 * Distinto de RequireRole: is_platform_admin es una marca aparte del
 * rol dentro de una empresa (administrador/trabajador) — puede haber
 * un super-admin que además sea "trabajador" de su propia empresa
 * de prueba, por ejemplo. Por eso tiene su propio guard.
 */
export default function RequirePlatformAdmin({ session, profile, children }) {
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return null;
  if (!profile.is_platform_admin) return <Navigate to="/dashboard" replace />;
  return children;
}
