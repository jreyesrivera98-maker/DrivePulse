-- ==========================================================
-- 0019_platform_super_admin.sql
--
-- Agrega un rol nuevo, independiente del rol dentro de una empresa
-- (administrador/trabajador): "administrador de plataforma" — eres
-- tú, el dueño de DrivePulse, no un cliente.
--
-- Diseño deliberado: el super-admin puede VER y ADMINISTRAR
-- organizaciones (nombre, plan, activar/suspender) y ver un
-- directorio básico de usuarios (para soporte). NO tiene acceso de
-- lectura a los datos operativos de cada cliente (vehículos,
-- bitácoras, ubicaciones GPS, combustible) — esa separación es a
-- propósito.
-- ==========================================================

alter table profiles add column if not exists is_platform_admin boolean not null default false;

create or replace function is_platform_admin() returns boolean as $$
  select coalesce((select is_platform_admin from profiles where id = auth.uid()), false);
$$ language sql security definer stable set search_path = public;

alter table organizations add column if not exists status text not null default 'activo'
  check (status in ('trial', 'activo', 'suspendido', 'cancelado'));

drop policy if exists "usuario ve su propia organizacion" on organizations;
create policy "usuario ve su organizacion, super-admin ve todas"
  on organizations for select
  using (id = auth_org_id() or is_platform_admin());

create policy "solo super-admin edita organizaciones"
  on organizations for update
  using (is_platform_admin());

create policy "super-admin lee todos los perfiles"
  on profiles for select
  using (is_platform_admin());

create or replace function platform_admin_org_stats()
returns table (
  organization_id uuid,
  vehicles_count bigint,
  users_count bigint,
  bitacoras_mes_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_platform_admin() then
    raise exception 'Solo un administrador de plataforma puede consultar estas métricas.';
  end if;

  return query
  select
    o.id,
    (select count(*) from vehicles v where v.organization_id = o.id),
    (select count(*) from profiles p where p.organization_id = o.id),
    (select count(*) from bitacoras b where b.organization_id = o.id and b.created_at >= date_trunc('month', now()))
  from organizations o;
end;
$$;

grant execute on function platform_admin_org_stats() to authenticated;

create or replace function platform_admin_set_org_status(p_org_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_platform_admin() then
    raise exception 'Solo un administrador de plataforma puede cambiar el estatus de una organización.';
  end if;
  if p_status not in ('trial', 'activo', 'suspendido', 'cancelado') then
    raise exception 'Estatus inválido: %', p_status;
  end if;

  update organizations set status = p_status where id = p_org_id;
end;
$$;

grant execute on function platform_admin_set_org_status(uuid, text) to authenticated;

create or replace function platform_admin_set_org_plan(p_org_id uuid, p_plan text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_platform_admin() then
    raise exception 'Solo un administrador de plataforma puede cambiar el plan de una organización.';
  end if;

  update organizations set plan = p_plan where id = p_org_id;
end;
$$;

grant execute on function platform_admin_set_org_plan(uuid, text) to authenticated;
