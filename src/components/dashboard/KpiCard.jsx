import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import Sparkline from "./Sparkline";

export default function KpiCard({ label, value, icon: Icon, color, trendData, deltaPct, linkTo }) {
  const navigate = useNavigate();
  const hasDelta = typeof deltaPct === "number" && isFinite(deltaPct);
  const isUp = hasDelta && deltaPct > 0;
  const isDown = hasDelta && deltaPct < 0;

  return (
    <button
      onClick={() => linkTo && navigate(linkTo)}
      className={`bg-white rounded-2xl border border-slate-200 p-4 text-left transition ${linkTo ? "hover:border-teal-300 hover:shadow-sm cursor-pointer" : "cursor-default"}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={16} />
        </div>
        {trendData && <Sparkline data={trendData} />}
      </div>
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <div className="flex items-center justify-between mt-0.5">
        <p className="text-[11px] text-slate-500">{label}</p>
        {hasDelta && (
          <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${isUp ? "text-emerald-600" : isDown ? "text-rose-600" : "text-slate-400"}`}>
            {isUp ? <TrendingUp size={11} /> : isDown ? <TrendingDown size={11} /> : <Minus size={11} />}
            {Math.abs(deltaPct).toFixed(0)}%
          </span>
        )}
      </div>
    </button>
  );
}
