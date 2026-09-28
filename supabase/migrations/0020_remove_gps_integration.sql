-- ==========================================================
-- 0020_remove_gps_integration.sql
--
-- Elimina la integración de GPS (era solo un enlace/iframe al
-- portal externo, sin datos reales — se retiró por decisión del
-- cliente). Se borra la tabla por completo (sus políticas se
-- eliminan automáticamente junto con ella).
--
-- IMPORTANTE: create_organization() insertaba una fila en esa tabla
-- para cada empresa nueva — hay que quitar esa línea, si no, dar de
-- alta una organización nueva empezaría a fallar en cuanto se borre
-- la tabla.
-- ==========================================================

drop table if exists gps_integration_settings cascade;

create or replace function create_organization(p_org_name text, p_admin_name text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_slug text;
  v_existing_org uuid;
begin
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;
  if p_org_name is null or trim(p_org_name) = '' then
    raise exception 'El nombre de la organización es obligatorio.';
  end if;

  select organization_id into v_existing_org from profiles where id = v_user_id;
  if v_existing_org is not null then
    raise exception 'Este usuario ya pertenece a una organización.';
  end if;

  v_slug := lower(regexp_replace(trim(p_org_name), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(v_user_id::text, 1, 6);

  insert into organizations (name, slug, plan) values (trim(p_org_name), v_slug, 'trial')
  returning id into v_org_id;

  update profiles set
    organization_id = v_org_id,
    name = coalesce(nullif(trim(p_admin_name), ''), name),
    role = 'administrador',
    status = 'activo'
  where id = v_user_id;

  insert into branding_settings (organization_id, name) values (v_org_id, trim(p_org_name));

  return jsonb_build_object('organization_id', v_org_id);
end;
$$;
