import { STATUS_META } from "../../hooks/useVehicles";

export default function Badge({ status, size = "md" }) {
  const m = STATUS_META[status] || STATUS_META.disponible;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1"
      }`}
      style={{ background: m.bg, color: m.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
}
