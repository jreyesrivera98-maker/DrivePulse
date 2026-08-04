-- ==========================================================
-- 0005_add_vehicle_identifier.sql
--
-- El panel de Configuración > Vehículos necesita distinguir entre:
--   - identifier: código interno corto (ej. "VW-AMA", "ES-001")
--   - plate: placas legales (ej. "PX-2672-B")
-- Antes solo existía `plate`. Se agrega `identifier` como columna
-- adicional, sin quitar nada existente. Para los vehículos ya
-- registrados, se inicializa igual a su placa (puedes editarlo
-- después desde Configuración > Vehículos).
-- ==========================================================

alter table vehicles add column if not exists identifier text;

update vehicles set identifier = plate where identifier is null;
