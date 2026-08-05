import { useMemo } from "react";
import { AlertTriangle, Wrench, Calendar, Clock } from "lucide-react";
import { todayISO } from "../lib/dateUtils";

/**
 * Fuente única de las alertas de flotilla. La usan tanto la campana
 * del TopBar (lista corta) como el panel de Alertas del Dashboard
 * (tarjetas completas con prioridad y acción) — así nunca hay dos
 * lugares calculando lo mismo con lógica distinta.
 *
 * Honestidad sobre lo que SÍ y NO se puede calcular hoy:
 * - Documentos "vencidos": nuestro esquema solo guarda si un
 *   documento está vigente o no (booleano), no su fecha de
 *   vencimiento. Por eso la alerta dice "falta/vencido", no
 *   "vence en X días" — eso requeriría agregar columnas de fecha.
 * - "Consumo anormal": no hay una línea base histórica calculada
 *   todavía, así que no se incluye (inventar un umbral arbitrario
 *   daría falsos positivos/negativos sin ningún valor real).
 */
export function useFleetAlerts({ vehicles = [], reservations = [], maintenance = [] }) {
  return useMemo(() => {
    const list = [];
    const today = todayISO();

    vehicles.forEach((v) => {
      const missing = [];
      if (!v.doc_circulacion) missing.push("Tarjeta de Circulación");
      if (!v.doc_seguro) missing.push("Seguro");
      if (!v.doc_verificacion) missing.push("Verificación");
      if (!v.doc_licencia_asociada) missing.push("Licencia asociada");

      if (missing.length) {
        list.push({
          id: `doc-${v.id}`,
          priority: "alta",
          type: "doc",
          icon: AlertTriangle,
          color: "text-rose-600 bg-rose-50",
          text: `${v.identifier || v.plate}: falta ${missing.join(", ")}`,
          vehicleId: v.id,
          vehicleLabel: v.identifier || v.plate,
          date: null,
          actionPath: "/configuracion",
          actionLabel: "Ver vehículo",
        });
      }

      if (v.status === "mantenimiento") {
        list.push({
          id: `maint-status-${v.id}`,
          priority: "media",
          type: "maint",
          icon: Wrench,
          color: "text-amber-600 bg-amber-50",
          text: `${v.identifier || v.plate} está en mantenimiento`,
          vehicleId: v.id,
          vehicleLabel: v.identifier || v.plate,
          date: null,
          actionPath: "/mantenimientos",
          actionLabel: "Ver mantenimientos",
        });
      }
    });

    reservations
      .filter((r) => r.start_date <= today && r.end_date >= today)
      .forEach((r) => {
        const v = vehicles.find((x) => x.id === r.vehicle_id);
        if (v && (v.status === "disponible" || v.status === "reservado")) {
          list.push({
            id: `res-${r.id}`,
            priority: "media",
            type: "res",
            icon: Calendar,
            color: "text-blue-600 bg-blue-50",
            text: `Reserva activa de ${v.identifier || v.plate} sin check-out registrado`,
            vehicleId: v.id,
            vehicleLabel: v.identifier || v.plate,
            date: r.start_date,
            actionPath: "/bitacora",
            actionLabel: "Registrar check-out",
          });
        }
      });

    maintenance
      .filter((m) => m.estado !== "Completado" && m.fecha && m.fecha < today)
      .forEach((m) => {
        const v = vehicles.find((x) => x.id === m.vehicle_id);
        list.push({
          id: `maint-overdue-${m.id}`,
          priority: "alta",
          type: "maint-overdue",
          icon: Clock,
          color: "text-rose-600 bg-rose-50",
          text: `Mantenimiento vencido: ${v?.identifier || v?.plate || "—"} — ${m.tipo} (programado ${m.fecha})`,
          vehicleId: m.vehicle_id,
          vehicleLabel: v?.identifier || v?.plate,
          date: m.fecha,
          actionPath: "/mantenimientos",
          actionLabel: "Ver mantenimiento",
        });
      });

    const priorityOrder = { alta: 0, media: 1, baja: 2 };
    return list.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [vehicles, reservations, maintenance]);
}
