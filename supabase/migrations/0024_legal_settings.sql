-- ==========================================================
-- 0024_legal_settings.sql
--
-- Datos del responsable para el Aviso de privacidad, configurables por
-- cada organización desde Configuración › Privacidad (antes vivían en
-- src/config/legal.js como marcadores).
--
-- Diseño:
--   * La tabla `legal_settings` NO tiene políticas RLS: nadie la lee ni la
--     escribe directo desde el cliente. Solo se accede mediante dos RPC.
--   * public_legal_info()  → lectura. Es PÚBLICA a propósito: el aviso de
--       privacidad debe poder consultarse sin iniciar sesión (login/registro).
--       - Con sesión: devuelve los datos de la organización del usuario.
--       - Sin sesión: no hay contexto de organización, así que solo devuelve
--         datos si la plataforma tiene UNA sola organización (despliegue de
--         una empresa); con varias devuelve null y el aviso muestra texto
--         genérico. Nunca mezcla datos entre organizaciones.
--       Solo expone los 4 campos del aviso, que son públicos por naturaleza.
--   * save_legal_settings(...) → escritura. Solo administradores, valida y
--       limita longitudes; registra quién y cuándo.
-- ==========================================================

create table if not exists public.legal_settings (
  organization_id uuid primary key references organizations(id) on delete cascade,
  responsable text,
  domicilio text,
  correo_privacidad text,
  plazo_conservacion text,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null
);

-- RLS activada y SIN políticas = acceso directo denegado a anon/authenticated.
alter table public.legal_settings enable row level security;

comment on table public.legal_settings is
  'Datos del responsable del aviso de privacidad, por organización. Acceso solo vía public_legal_info() y save_legal_settings().';

-- ----------------------------------------------------------
-- Lectura (pública)
-- ----------------------------------------------------------
create or replace function public.public_legal_info()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_row legal_settings%rowtype;
begin
  if auth.uid() is not null then
    v_org := auth_org_id();
  elsif (select count(*) from organizations) = 1 then
    select id into v_org from organizations limit 1;
  end if;

  if v_org is null then
    return null;
  end if;

  select * into v_row from legal_settings where organization_id = v_org;
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'responsable', v_row.responsable,
    'domicilio', v_row.domicilio,
    'correo_privacidad', v_row.correo_privacidad,
    'plazo_conservacion', v_row.plazo_conservacion,
    'updated_at', v_row.updated_at
  );
end;
$$;

grant execute on function public.public_legal_info() to anon, authenticated;

-- ----------------------------------------------------------
-- Escritura (solo administrador)
-- ----------------------------------------------------------
create or replace function public.save_legal_settings(
  p_responsable text,
  p_domicilio text,
  p_correo_privacidad text,
  p_plazo_conservacion text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_responsable text := nullif(btrim(coalesce(p_responsable, '')), '');
  v_domicilio text := nullif(btrim(coalesce(p_domicilio, '')), '');
  v_correo text := nullif(btrim(coalesce(p_correo_privacidad, '')), '');
  v_plazo text := nullif(btrim(coalesce(p_plazo_conservacion, '')), '');
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if auth_role() is distinct from 'administrador' then
    raise exception 'Solo un administrador puede modificar los datos del aviso de privacidad.';
  end if;

  v_org := auth_org_id();
  if v_org is null then
    raise exception 'Tu cuenta todavía no pertenece a ninguna organización.';
  end if;

  if length(coalesce(v_responsable, '')) > 200 or length(coalesce(v_plazo, '')) > 120 or length(coalesce(v_correo, '')) > 200 then
    raise exception 'Alguno de los datos es demasiado largo.';
  end if;
  if length(coalesce(v_domicilio, '')) > 500 then
    raise exception 'El domicilio es demasiado largo (máximo 500 caracteres).';
  end if;
  if v_correo is not null and v_correo !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'El correo de privacidad no tiene un formato válido.';
  end if;

  insert into legal_settings (organization_id, responsable, domicilio, correo_privacidad, plazo_conservacion, updated_at, updated_by)
  values (v_org, v_responsable, v_domicilio, v_correo, v_plazo, now(), v_uid)
  on conflict (organization_id) do update set
    responsable = excluded.responsable,
    domicilio = excluded.domicilio,
    correo_privacidad = excluded.correo_privacidad,
    plazo_conservacion = excluded.plazo_conservacion,
    updated_at = excluded.updated_at,
    updated_by = excluded.updated_by;

  return public_legal_info();
end;
$$;

-- Por defecto Postgres da EXECUTE a PUBLIC; la escritura es solo para usuarios con sesión.
revoke all on function public.save_legal_settings(text, text, text, text) from public, anon;
grant execute on function public.save_legal_settings(text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
