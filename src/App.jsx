import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { supabase, onAuthChange } from "./lib/supabaseClient";

/**
 * Punto de partida del enrutamiento real de DrivePulse.
 * Aquí se migran, una por una, las vistas del prototipo
 * (DrivePulse.jsx) hacia componentes en src/routes/*.
 *
 * Este archivo solo resuelve el arranque de sesión (para no
 * redirigir prematuramente a /login mientras Supabase todavía
 * está validando un enlace de invitación/recuperación) y dejar
 * las rutas base declaradas.
 */
export default function App() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const unsubscribe = onAuthChange((event, newSession) => {
      setSession(newSession);
      // event === "PASSWORD_RECOVERY" => aquí es donde /set-password
      // decide mostrar el formulario en vez de mandar a /login.
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-dp-black flex items-center justify-center text-slate-400 text-sm">
        Cargando DrivePulse…
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Placeholder title="Login" note="Migrar LoginScreen del prototipo" />} />
      <Route path="/set-password" element={<Placeholder title="Crear tu Contraseña" note="Migrar SetPasswordScreen" />} />
      <Route path="/dashboard" element={<Placeholder title="Dashboard" note="Solo administrador" />} />
      <Route path="/reservas" element={<Placeholder title="Calendario de Reservas" />} />
      <Route path="/bitacora" element={<Placeholder title="Bitácora Diaria" />} />
      <Route path="/vehiculo/:id" element={<Placeholder title="Landing de Vehículo (QR)" />} />
      <Route path="/mantenimientos" element={<Placeholder title="Mantenimientos" note="Solo administrador" />} />
      <Route path="/inspecciones" element={<Placeholder title="Inspecciones" note="Solo administrador" />} />
      <Route path="/configuracion" element={<Placeholder title="Configuración" note="Solo administrador" />} />
      <Route path="*" element={<Navigate to={session ? "/reservas" : "/login"} replace />} />
    </Routes>
  );
}

function Placeholder({ title, note }) {
  return (
    <div className="min-h-screen bg-dp-surface flex flex-col items-center justify-center gap-2 text-center px-4">
      <h1 className="text-xl font-bold text-slate-800">{title}</h1>
      <p className="text-sm text-slate-500 max-w-sm">
        {note || "Vista pendiente de migrar desde DrivePulse.jsx (prototipo)."}
      </p>
    </div>
  );
}
