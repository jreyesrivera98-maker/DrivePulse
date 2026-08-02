import { Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { useAuth } from "./hooks/useAuth";
import { useBranding } from "./hooks/useBranding";
import { SelectedVehicleProvider } from "./contexts/SelectedVehicleContext";
import RequireRole from "./guards/RequireRole";
import PulseMark from "./components/ui/PulseMark";
import Shell from "./components/layout/Shell";

import Login from "./routes/Login";
import SetPassword from "./routes/SetPassword";
import Dashboard from "./routes/Dashboard";
import Reservas from "./routes/Reservas";
import Bitacora from "./routes/Bitacora";
import Mantenimientos from "./routes/Mantenimientos";
import Configuracion from "./routes/Configuracion";
import Inspecciones from "./routes/Inspecciones";
import VehiculoLanding from "./routes/VehiculoLanding";

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
    </SelectedVehicleProvider>
  );
}

function Placeholder({ title, note }) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-2 text-center px-4 py-24">
      <h1 className="text-xl font-bold text-slate-800">{title}</h1>
      <p className="text-sm text-slate-500 max-w-sm">
        {note || "Sesión y rol verificados por Supabase. Vista visual pendiente de migrar desde reference/DrivePulse.jsx."}
      </p>
    </div>
  );
}
