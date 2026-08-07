-- ==========================================================
-- 0012_bitacoras_visibles_para_todos.sql
--
-- Corrige un bug real: la policy de SELECT en `bitacoras` solo
-- dejaba ver el propio registro a un trabajador. Si otra persona
-- necesitaba cerrar (check-in) un viaje que alguien más abrió, la
-- consulta del cliente lo ocultaba por RLS y la app nunca mostraba
-- el formulario de cierre — aunque el viaje sí seguía abierto en la
-- base de datos, nadie más que el conductor original (o un admin)
-- podía verlo para cerrarlo.
--
-- Esto también es justo lo que se pidió aparte: que el uso real de
-- cada vehículo (quién lo trae, desde cuándo) sea visible para todo
-- el equipo, no solo para quien lo sacó.
-- ==========================================================

drop policy if exists "admin ve todas, trabajador ve las suyas" on bitacoras;
create policy "todos los autenticados leen bitacoras"
  on bitacoras for select
  using (auth.uid() is not null);

drop policy if exists "admin ve todos los danios, trabajador ve los de sus bitacoras" on bitacora_danios;
create policy "todos los autenticados leen danios"
  on bitacora_danios for select
  using (auth.uid() is not null);
