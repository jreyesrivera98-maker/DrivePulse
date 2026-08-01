export const todayISO = () => new Date().toISOString().slice(0, 10);

export const addDays = (dateStr, n) => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
};

export const fmtShort = (iso) => fmtDate(iso).split(" ")[0];

export const dayLabel = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("es-MX", { weekday: "short" });

/** Lunes de la semana que contiene `dateStr` (0=domingo..6=sábado en JS). */
export const startOfWeek = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay(); // 0=domingo
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d.toISOString().slice(0, 10);
};
