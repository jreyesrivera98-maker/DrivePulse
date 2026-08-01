import { useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";

let idCounter = 0;

export function useToasts() {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg, type = "success") => {
    const id = ++idCounter;
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  return { toasts, toast, remove };
}

export function ToastStack({ toasts, remove }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-xl shadow-lg border px-4 py-3 flex items-start gap-3 animate-fadeIn ${
            t.type === "error" ? "bg-rose-50 border-rose-200" : "bg-white border-slate-200"
          }`}
        >
          <div className={`mt-0.5 ${t.type === "error" ? "text-rose-600" : "text-teal-600"}`}>
            {t.type === "error" ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          </div>
          <div className="flex-1 text-sm text-slate-700">{t.msg}</div>
          <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
