import { useNavigate } from "react-router-dom";
import { AlertTriangle, ChevronRight, CheckCircle2 } from "lucide-react";

const PRIORITY_META = {
  alta: { label: "Alta", color: "bg-rose-100 text-rose-700" },
  media: { label: "Media", color: "bg-amber-100 text-amber-700" },
  baja: { label: "Baja", color: "bg-slate-100 text-slate-600" },
};

export default function DashboardAlertsCard({ alerts }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
          <AlertTriangle size={15} className="text-rose-500" /> Alertas inteligentes
        </h3>
        {alerts.length > 0 && (
          <span className="text-[10px] font-bold bg-rose-500 text-white rounded-full px-2 py-0.5">{alerts.length}</span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 size={24} className="text-emerald-500 mb-2" />
          <p className="text-xs text-slate-500">Sin alertas activas. Todo en orden.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {alerts.map((a) => (
            <button
              key={a.id}
              onClick={() => navigate(a.actionPath)}
              className="w-full flex items-start gap-3 p-2.5 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition text-left"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.color}`}>
                <a.icon size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${PRIORITY_META[a.priority].color}`}>
                    {PRIORITY_META[a.priority].label}
                  </span>
                  {a.date && <span className="text-[10px] text-slate-400">{a.date}</span>}
                </div>
                <p className="text-xs text-slate-700 leading-snug">{a.text}</p>
              </div>
              <ChevronRight size={14} className="text-slate-300 shrink-0 mt-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
