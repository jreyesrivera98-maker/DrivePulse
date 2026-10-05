-- ==========================================================
-- 0023_realtime_reservations.sql
--
-- Asegura que `reservations` esté en la publicación de Realtime para que
-- las ediciones, eliminaciones y reprogramaciones de un administrador se
-- reflejen al instante en el calendario de los demás usuarios.
-- Idempotente: si ya estaba agregada (p. ej. desde el dashboard), no hace nada.
-- (El frontend además refresca tras cada cambio, así que no depende de esto.)
-- ==========================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reservations'
     ) then
    alter publication supabase_realtime add table public.reservations;
  end if;
end
$$;
