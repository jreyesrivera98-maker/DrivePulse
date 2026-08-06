import { useSelectedVehicle } from "../../contexts/SelectedVehicleContext";
import Badge from "../ui/Badge";

/**
 * En escritorio, el Panel de Flotilla (320px) ya deja elegir el
 * vehículo. En móvil ese panel se oculta por espacio — esto lo
 * reemplaza con un carrusel horizontal deslizable, mismo dato/mismo
 * contexto de selección, solo que en formato de tarjetas para dedo.
 */
export default function MobileVehicleSwiper({ vehicles }) {
  const { selectedVehicleId, setSelectedVehicleId } = useSelectedVehicle();

  if (vehicles.length === 0) return null;

  return (
    <div className="md:hidden -mx-4 px-4 mb-1">
      <div className="flex gap-2.5 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
        {vehicles.map((v) => {
          const active = selectedVehicleId === v.id || (!selectedVehicleId && vehicles[0]?.id === v.id);
          return (
            <button
              key={v.id}
              onClick={() => setSelectedVehicleId(v.id)}
              className={`snap-start shrink-0 w-40 rounded-xl border overflow-hidden text-left transition ${
                active ? "border-teal-400 ring-2 ring-teal-100" : "border-slate-200"
              }`}
            >
              {v.photo_url && <img src={v.photo_url} alt="" className="w-full h-20 object-cover" />}
              <div className="p-2">
                <p className="text-xs font-semibold text-slate-800 truncate">{v.identifier || v.plate}</p>
                <p className="text-[10px] text-slate-400 truncate mb-1">{v.brand} {v.model}</p>
                <Badge status={v.status} size="sm" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
