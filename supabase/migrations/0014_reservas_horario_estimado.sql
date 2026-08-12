-- ==========================================================
-- 0014_reservas_horario_estimado.sql
--
-- Agrega hora de salida y regreso ESTIMADAS a las reservas (hasta
-- ahora solo tenían fecha, sin hora). Nota: la bitácora ya captura
-- la hora REAL de salida y regreso automáticamente (created_at /
-- closed_at, con precisión de servidor) — no requiere cambios de
-- esquema, solo se muestra más claramente en pantalla.
-- ==========================================================

alter table reservations add column if not exists hora_salida_estimada time;
alter table reservations add column if not exists hora_regreso_estimada time;
