import { useNavigate } from "react-router-dom";
import { Plus, Wrench, Fuel, ShieldCheck, Car, Calendar } from "lucide-react";
import { useSelectedVehicle } from "../../contexts/SelectedVehicleContext";

export default function QuickActions() {
  const navigate = useNavigate();
  const { requestNewReservation } = useSelectedVehicle();

  const actions = [
    {
      label: "Nueva reserva",
      icon: Calendar,
      onClick: () => {
        requestNewReservation();
        navigate("/reservas");
      },
    },
    { label: "Nuevo mantenimiento", icon: Wrench, onClick: () => navigate("/mantenimientos") },
    { label: "Nueva recarga", icon: Fuel, onClick: () => navigate("/combustible") },
    { label: "Nueva inspección", icon: ShieldCheck, onClick: () => navigate("/inspecciones") },
    { label: "Registrar vehículo", icon: Car, onClick: () => navigate("/configuracion") },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg px-3 py-2 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50/40 transition"
          >
            <Plus size={12} className="text-teal-500" />
            <a.icon size={13} />
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
