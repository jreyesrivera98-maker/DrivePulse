import { createContext, useContext, useState, useCallback } from "react";

const SelectedVehicleContext = createContext(null);

/**
 * Sincroniza la unidad seleccionada entre el Panel de Flotilla
 * (izquierda) y cualquier página que la use (Reservas, Bitácora...),
 * sin acoplar esas páginas al layout. También expone una señal para
 * que el botón "+ Nueva Reserva" del panel abra el modal aunque la
 * página de Reservas no esté montada (por ejemplo, si estás en
 * Bitácora y tocas "Nueva Reserva" en el panel).
 */
export function SelectedVehicleProvider({ children }) {
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [newReservationRequest, setNewReservationRequest] = useState(0);

  const requestNewReservation = useCallback(() => {
    setNewReservationRequest((n) => n + 1);
  }, []);

  return (
    <SelectedVehicleContext.Provider
      value={{ selectedVehicleId, setSelectedVehicleId, newReservationRequest, requestNewReservation }}
    >
      {children}
    </SelectedVehicleContext.Provider>
  );
}

export function useSelectedVehicle() {
  const ctx = useContext(SelectedVehicleContext);
  if (!ctx) throw new Error("useSelectedVehicle debe usarse dentro de <SelectedVehicleProvider>");
  return ctx;
}
