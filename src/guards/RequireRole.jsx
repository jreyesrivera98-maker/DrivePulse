import { Navigate, useLocation } from "react-router-dom";

/**
 * Bloquea el acceso a una ruta si el perfil no tiene sesión o no
 * tiene uno de los roles permitidos. Esto es la barrera del lado del
 * cliente (UX); la barrera real e infranqueable son las políticas RLS
 * en Supabase (ver supabase/migrations/0001_init.sql) — aunque
 * alguien manipulara el cliente, la base de datos igual rechazaría
 * lecturas/escrituras fuera de su rol.
 */
export default function RequireRole({ session, profile, allow, fallback = "/reservas", children }) {
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!profile) {
    // Sesión válida pero el perfil todavía no cargó / no existe.
    return null;
  }

  if (!allow.includes(profile.role)) {
    return <Navigate to={fallback} replace />;
  }

  return children;
}
