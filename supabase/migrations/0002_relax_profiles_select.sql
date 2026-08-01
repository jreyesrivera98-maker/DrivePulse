-- ==========================================================
-- 0002_relax_profiles_select.sql
--
-- La policy original de SELECT en `profiles` solo dejaba ver el
-- propio perfil (o todos, si eras administrador). Eso rompe el
-- calendario de reservas: un trabajador no podría ver el NOMBRE de
-- otro colaborador en una reserva ajena (el join simplemente
-- regresaría null para esas filas).
--
-- Para una herramienta interna de flotilla, que todos los
-- colaboradores autenticados vean el nombre/área de sus compañeros
-- es esperado (como en cualquier directorio interno). Lo que se
-- mantiene sin cambio es que solo el ADMIN puede crear, editar o
-- borrar perfiles (esa policy "for all" no se toca).
-- ==========================================================

drop policy if exists "usuarios ven su propio perfil o admin ve todos" on profiles;

create policy "todos los autenticados leen perfiles"
  on profiles for select
  using (auth.uid() is not null);
