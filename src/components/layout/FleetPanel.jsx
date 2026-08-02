import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, Plus } from "lucide-react";
import { useVehicles } from "../../hooks/useVehicles";
import { useSelectedVehicle } from "../../contexts/SelectedVehicleContext";
import Badge from "../ui/Badge";

export default function FleetPanel() {
  const { vehicles, loading } = useVehicles();
  const { selectedVehicleId, setSelectedVehicleId, requestNewReservation } = useSelectedVehicle();
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState("");

  const filtered = vehicles.filter((v) =>
    `${v.brand} ${v.model} ${v.plate} ${v.category}`.toLowerCase().includes(q.toLowerCase())
  );

  const grouped = filtered.reduce((acc, v) => {
    const key = v.category || "Otros";
    acc[key] = acc[key] || [];
    acc[key].push(v);
    return acc;
  }, {});

  const handleNewReservation = () => {
    requestNewReservation();
    if (location.pathname !== "/reservas") navigate("/reservas");
  };

  return (
    <div className="w-[320px] shrink-0 border-r border-slate-200 bg-white flex flex-col h-full">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800 text-sm">Flotilla</h3>
          <span className="text-[11px] text-slate-400 font-medium">{filtered.length} unidades</span>
        </div>
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por placa, marca..."
            className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition"
          />
        </div>
        <button
          onClick={handleNewReservation}
          className="w-full flex items-center justify-center gap-1.5 bg-dp-black hover:bg-[#161d30] text-white text-xs font-semibold rounded-lg py-2.5 transition"
        >
          <Plus size={14} /> Nueva Reserva
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {loading && <p className="text-xs text-slate-400 text-center mt-8">Cargando flotilla…</p>}
        {!loading && Object.keys(grouped).length === 0 && <p className="text-xs text-slate-400 text-center mt-8">Sin resultados.</p>}

        {Object.entries(grouped).map(([cat, vs]) => (
          <div key={cat} className="mb-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5">{cat}</p>
            {vs.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVehicleId(v.id)}
                className={`w-full text-left rounded-xl p-2.5 mb-1.5 flex items-center gap-3 transition border ${
                  selectedVehicleId === v.id ? "bg-teal-50 border-teal-200" : "border-transparent hover:bg-slate-50"
                }`}
              >
                {v.photo_url && <img src={v.photo_url} alt={v.model} className="w-12 h-10 rounded-lg object-cover shrink-0 bg-slate-100" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{v.brand} {v.model}</p>
                  <p className="text-[11px] text-slate-400 font-mono">{v.plate}</p>
                </div>
                <Badge status={v.status} size="sm" />
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
