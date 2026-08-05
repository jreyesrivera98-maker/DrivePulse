-- ==========================================================
-- 0010_profiles_self_update.sql
--
-- Corrige que un colaborador (no administrador) se quedara
-- atrapado en /set-password: al crear su contraseña, la app intenta
-- marcar profiles.status = 'activo' en su propio registro, pero la
-- única policy de UPDATE existente exigía ser administrador. La
-- actualización se rechazaba en silencio y el perfil nunca salía de
-- 'invitado'.
--
-- Esto agrega una policy para que cualquier usuario autenticado
-- pueda actualizar SU PROPIO perfil, protegida por un trigger que
-- impide que alguien se suba su propio rol a 'administrador' (eso
-- sigue siendo exclusivo de un administrador ya existente).
-- ==========================================================

create policy "usuario actualiza su propio perfil"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role <> old.role and auth_role() <> 'administrador' then
    raise exception 'No tienes permiso para cambiar tu propio rol.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_self_role_escalation on profiles;
create trigger trg_prevent_self_role_escalation
  before update on profiles
  for each row
  execute function public.prevent_self_role_escalation();
