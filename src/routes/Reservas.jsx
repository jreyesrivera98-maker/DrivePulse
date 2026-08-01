import { useState } from "react";
import { useVehicles } from "../hooks/useVehicles";
import { useReservations } from "../hooks/useReservations";
import { useProfiles } from "../hooks/useProfiles";
import { useToasts, ToastStack } from "../components/ui/Toast";
import WeeklyCalendar from "../components/reservas/WeeklyCalendar";
import VehicleBanner from "../components/reservas/VehicleBanner";
import NewReservationModal from "../components/reservas/NewReservationModal";
import { Loader2 } from "lucide-react";

export default function Reservas({ profile }) {
  const { vehicles, loading: loadingVehicles, error: vehiclesError } = useVehicles();
  const { reservations, loading: loadingReservations, error: reservationsError, createReservation, moveReservation } = useReservations();
  const { profiles } = useProfiles();
  const { toasts, toast, remove } = useToasts();

  const isAdmin = profile?.role === "administrador";
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const activeVehicleId = selectedVehicleId || vehicles[0]?.id || null;
  const selectedVehicle = vehicles.find((v) => v.id === activeVehicleId);

  const handleDrop = async (reservationId, target) => {
    try {
      await moveReservation(reservationId, target);
      toast("Reserva reubicada correctamente.");
    } catch (err) {
      toast(err.message || "No se pudo mover la reserva.", "error");
    }
  };

  const handleCreate = async (form) => {
    await createReservation({
      vehicle_id: form.vehicle_id,
      user_id: form.user_id,
      project: form.project || null,
      destino: form.destino || null,
      autorizado_por: form.autorizado_por || null,
      start_date: form.start_date,
      end_date: form.end_date,
    });
    toast("Reserva creada correctamente.");
  };

  const loading = loadingVehicles || loadingReservations;
  const loadError = vehiclesError || reservationsError;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24 text-slate-400 gap-2">
        <Loader2 size={18} className="animate-spin" /> Cargando calendario…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-lg mx-auto mt-16 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl p-4">
        Ocurrió un error al cargar los datos: {loadError}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <ToastStack toasts={toasts} remove={remove} />

      {selectedVehicle && <VehicleBanner vehicle={selectedVehicle} />}

      <WeeklyCalendar
        vehicles={vehicles}
        reservations={reservations}
        isAdmin={isAdmin}
        weekOffset={weekOffset}
        setWeekOffset={setWeekOffset}
        onDrop={handleDrop}
        onNewReservation={() => setModalOpen(true)}
      />

      <NewReservationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        vehicles={vehicles}
        profiles={profiles}
        currentProfile={profile}
        isAdmin={isAdmin}
        defaultVehicleId={activeVehicleId}
        onCreate={handleCreate}
      />
    </div>
  );
}
