import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { useAuth } from "./hooks/useAuth";
import { useBranding } from "./hooks/useBranding";
import { SelectedVehicleProvider } from "./contexts/SelectedVehicleContext";
import RequireRole from "./guards/RequireRole";
import PulseMark from "./components/ui/PulseMark";
import Shell from "./components/layout/Shell";

// Login y SetPassword se cargan de inmediato: son la primera pantalla
// que ve cualquiera sin sesión, no tiene caso diferirlas.
import Login from "./routes/Login";
import SetPassword from "./routes/SetPassword";

// El resto de las rutas se cargan bajo demanda (code-splitting), para
// que el bundle inicial no incluya recharts, xlsx ni qrcode.react
// hasta que la persona realmente navegue a la pantalla que los usa.
const Dashboard = lazy(() => import("./routes/Dashboard"));
const Reservas = lazy(() => import("./routes/Reservas"));
const Bitacora = lazy(() => import("./routes/Bitacora"));
const Mantenimientos = lazy(() => import("./routes/Mantenimientos"));
const Configuracion = lazy(() => import("./routes/Configuracion"));
const Inspecciones = lazy(() => import("./routes/Inspecciones"));
const VehiculoLanding = lazy(() => import("./routes/VehiculoLanding"));
const Combustible = lazy(() => import("./routes/Combustible"));
const Historico = lazy(() => import("./routes/Historico"));
const Auditoria = lazy(() => import("./routes/Auditoria"));
const Gps = lazy(() => import("./routes/Gps"));

/**
 * Enrutamiento real de DrivePulse.
 *
 * Ya migrado y conectado a Supabase: /login y /set-password.
 * Pendiente de migrar (siguiente etapa): Dashboard, Reservas,
 * Bitácora, Vehículo(QR), Mantenimientos, Inspecciones, Configuración
 * — hoy viven como referencia en reference/DrivePulse.jsx.
 */
export default function App() {
  const { session, profile, loading, passwordRecovery, completePasswordRecovery, reloadProfile } = useAuth();
  const { branding } = useBranding();

  // Loader inicial: nunca decidimos a dónde mandar a alguien mientras
  // esto siga en true — evita el flash/redirect prematuro a /login
  // cuando en realidad venía de un enlace de invitación.
  if (loading) {
    return (
      <div className="min-h-screen bg-dp-black flex flex-col items-center justify-center gap-4">
        <PulseMark size={48} logoUrl={branding.logo_url} />
        <Loader2 className="animate-spin text-teal-400" size={22} />
        <p className="text-slate-400 text-sm">Cargando {branding.name}…</p>
      </div>
    );
  }

  // Un enlace de invitación/recuperación tiene prioridad absoluta
  // sobre cualquier ruta que haya pedido el navegador.
  if (passwordRecovery) {
    return <SetPassword profile={profile} reloadProfile={reloadProfile} onDone={completePasswordRecovery} />;
  }

  return (
    <SelectedVehicleProvider>
      <Suspense fallback={<RouteLoader />}>
      <Routes>
      <Route path="/login" element={<Login session={session} profile={profile} />} />

      <Route
        path="/dashboard"
        element={
          <RequireRole session={session} profile={profile} allow={["administrador"]}>
            <Shell profile={profile} branding={branding}>
              <Dashboard />
            </Shell>
          </RequireRole>
        }
      />

      <Route
        path="/reservas"
        element={
          <RequireRole session={session} profile={profile} allow={["administrador", "trabajador"]}>
            <Shell profile={profile} branding={branding}>
              <Reservas profile={profile} />
            </Shell>
          </RequireRole>
        }
      />

      <Route
        path="/bitacora"
        element={
          <RequireRole session={session} profile={profile} allow={["administrador", "trabajador"]}>
            <Shell profile={profile} branding={branding}>
              <Bitacora profile={profile} />
            </Shell>
          </RequireRole>
        }
      />

      <Route
        path="/combustible"
        element={
          <RequireRole session={session} profile={profile} allow={["administrador", "trabajador"]}>
            <Shell profile={profile} branding={branding}>
              <Combustible profile={profile} />
            </Shell>
          </RequireRole>
        }
      />

      <Route
        path="/vehiculo/:id"
        element={
          <RequireRole session={session} profile={profile} allow={["administrador", "trabajador"]}>
            <Shell profile={profile} branding={branding}>
              <VehiculoLanding />
            </Shell>
          </RequireRole>
        }
      />

      <Route
        path="/mantenimientos"
        element={
          <RequireRole session={session} profile={profile} allow={["administrador"]}>
            <Shell profile={profile} branding={branding}>
              <Mantenimientos />
            </Shell>
          </RequireRole>
        }
      />

      <Route
        path="/inspecciones"
        element={
          <RequireRole session={session} profile={profile} allow={["administrador"]}>
            <Shell profile={profile} branding={branding}>
              <Inspecciones />
            </Shell>
          </RequireRole>
        }
      />

      <Route
        path="/historico"
        element={
          <RequireRole session={session} profile={profile} allow={["administrador"]}>
            <Shell profile={profile} branding={branding}>
              <Historico />
            </Shell>
          </RequireRole>
        }
      />

      <Route
        path="/auditoria"
        element={
          <RequireRole session={session} profile={profile} allow={["administrador"]}>
            <Shell profile={profile} branding={branding}>
              <Auditoria />
            </Shell>
          </RequireRole>
        }
      />

      <Route
        path="/gps"
        element={
          <RequireRole session={session} profile={profile} allow={["administrador"]}>
            <Shell profile={profile} branding={branding}>
              <Gps />
            </Shell>
          </RequireRole>
        }
      />

      <Route
        path="/configuracion"
        element={
          <RequireRole session={session} profile={profile} allow={["administrador"]}>
            <Shell profile={profile} branding={branding}>
              <Configuracion />
            </Shell>
          </RequireRole>
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to={session && profile ? (profile.role === "administrador" ? "/dashboard" : "/reservas") : "/login"}
            replace
          />
        }
      />
    </Routes>
      </Suspense>
    </SelectedVehicleProvider>
  );
}

function RouteLoader() {
  return (
    <div className="min-h-screen bg-dp-surface flex items-center justify-center">
      <Loader2 className="animate-spin text-teal-600" size={22} />
    </div>
  );
}
