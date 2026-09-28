-- ==========================================================
-- 0018_multi_tenancy_functions.sql  (3/3)
--
-- Las funciones SECURITY DEFINER (submit_bitacora, close_bitacora,
-- etc.) corren con privilegios elevados y NO están sujetas a RLS —
-- por diseño, para poder tocar varias tablas de forma atómica. Eso
-- significa que la protección multi-tenant de esas funciones tiene
-- que programarse A MANO dentro de cada una; agregar la columna y
-- las policies (migraciones 0016/0017) no las protege solas.
--
-- También agrega el flujo de alta de una organización nueva
-- (autoservicio) y hace que las invitaciones queden ligadas a la
-- organización de quien invita.
-- ==========================================================

-- profiles.organization_id se relaja a nullable: un usuario recién
-- creado por auto-registro existe un instante sin organización,
-- hasta que create_organization() se lo asigna en el mismo flujo.
-- Mientras esté en null, auth_org_id() devuelve null y CUALQUIER
-- policy "organization_id = auth_org_id()" lo deja sin ver nada —
-- es un estado seguro por defecto, no un hueco de seguridad.
alter table profiles alter column organization_id drop not null;

-- ----------------------------------------------------------
-- handle_new_user(): ahora hereda organization_id desde los datos
-- que la Edge Function invite-user manda al invitar (para
-- colaboradores invitados). Para alguien que se auto-registra sin
-- invitación, queda en null hasta llamar create_organization().
-- ----------------------------------------------------------
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, name, email, status, organization_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    new.email,
    'invitado',
    nullif(new.raw_user_meta_data->>'organization_id', '')::uuid
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ----------------------------------------------------------
-- create_organization(): alta de una empresa nueva en DrivePulse.
-- Se llama justo después de que alguien se auto-registra (ya tiene
-- sesión, pero sin organización todavía). Crea la organización, lo
-- vuelve su primer administrador, y le da branding/GPS por defecto.
-- ----------------------------------------------------------
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
  insert into gps_integration_settings (organization_id) values (v_org_id);

  return jsonb_build_object('organization_id', v_org_id);
end;
$$;

grant execute on function create_organization(text, text) to authenticated;

-- ----------------------------------------------------------
-- submit_bitacora — agrega verificación de organización y guarda
-- organization_id en cada tabla que toca.
-- ----------------------------------------------------------
create or replace function public.submit_bitacora(
  p_vehicle_id uuid,
  p_tipo text,
  p_proyecto text,
  p_destino text,
  p_autorizado_por text,
  p_km_inicial int,
  p_km_final int,
  p_combustible_salida fuel_level,
  p_combustible_regreso fuel_level,
  p_limpieza boolean,
  p_incidencias text,
  p_danios jsonb,
  p_firma_url text,
  p_gps_lat double precision,
  p_gps_lng double precision,
  p_voucher jsonb,
  p_user_agent text default null,
  p_incidencia_fotos jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_bitacora_id uuid;
  v_snapshot jsonb;
  v_hash text;
  v_danio jsonb;
begin
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  v_org_id := auth_org_id();
  if v_org_id is null then
    raise exception 'Tu cuenta todavía no pertenece a ninguna organización.';
  end if;

  if not exists (select 1 from vehicles where id = p_vehicle_id and organization_id = v_org_id) then
    raise exception 'Este vehículo no pertenece a tu organización.';
  end if;

  if exists (select 1 from bitacoras where vehicle_id = p_vehicle_id and estado = 'abierta') then
    raise exception 'Este vehículo ya tiene un viaje abierto. Debe cerrarse (check-in) antes de registrar una nueva salida.';
  end if;

  insert into bitacoras (
    organization_id, vehicle_id, user_id, tipo, proyecto, destino, autorizado_por,
    km_inicial, km_final, combustible_salida, combustible_regreso,
    limpieza, incidencias, incidencia_fotos, firma_url, gps_lat, gps_lng,
    estado, created_at
  ) values (
    v_org_id, p_vehicle_id, v_user_id, 'salida', p_proyecto, p_destino, p_autorizado_por,
    p_km_inicial, null, p_combustible_salida, null,
    p_limpieza, p_incidencias, coalesce(p_incidencia_fotos, '[]'::jsonb), p_firma_url, p_gps_lat, p_gps_lng,
    'abierta', now()
  ) returning id into v_bitacora_id;

  if p_danios is not null then
    for v_danio in select * from jsonb_array_elements(p_danios)
    loop
      insert into bitacora_danios (organization_id, bitacora_id, zona, nota, foto_url)
      values (v_org_id, v_bitacora_id, v_danio->>'zone', v_danio->>'note', v_danio->>'fotoUrl');
    end loop;
  end if;

  if p_voucher is not null then
    insert into fuel_vouchers (organization_id, bitacora_id, vehicle_id, user_id, imagen_url, litros, monto, estacion, folio, ocr_confidence, fecha_ticket, proyecto)
    values (
      v_org_id, v_bitacora_id, p_vehicle_id, v_user_id,
      p_voucher->>'imagenUrl',
      nullif(p_voucher->>'litros', '')::numeric,
      nullif(p_voucher->>'monto', '')::numeric,
      p_voucher->>'estacion', p_voucher->>'folio',
      coalesce(nullif(p_voucher->>'ocrConfidence', ''), 'Media'),
      nullif(p_voucher->>'fecha', '')::timestamptz,
      p_proyecto
    );
  end if;

  update vehicles set status = 'en_uso'::vehicle_status, fuel = coalesce(p_combustible_salida, fuel) where id = p_vehicle_id;

  select jsonb_build_object(
    'evento', 'CHECK_OUT_INICIO', 'bitacora_id', v_bitacora_id, 'vehicle_id', p_vehicle_id,
    'user_id', v_user_id, 'proyecto', p_proyecto, 'destino', p_destino, 'autorizado_por', p_autorizado_por,
    'km_inicial', p_km_inicial, 'combustible_salida', p_combustible_salida, 'limpieza', p_limpieza,
    'incidencias', p_incidencias, 'incidencia_fotos', p_incidencia_fotos, 'danios', p_danios,
    'firma_url', p_firma_url, 'gps', jsonb_build_object('lat', p_gps_lat, 'lng', p_gps_lng),
    'voucher', p_voucher, 'user_agent', p_user_agent, 'timestamp_servidor', now()
  ) into v_snapshot;

  v_hash := encode(digest(v_snapshot::text, 'sha256'), 'hex');
  insert into auditoria_logs (organization_id, bitacora_id, snapshot, hash, created_at) values (v_org_id, v_bitacora_id, v_snapshot, v_hash, now());

  return jsonb_build_object('bitacora_id', v_bitacora_id, 'hash', v_hash);
end;
$$;

-- ----------------------------------------------------------
-- close_bitacora — verifica que el viaje pertenezca a la
-- organización de quien lo está cerrando.
-- ----------------------------------------------------------
create or replace function public.close_bitacora(
  p_bitacora_id uuid,
  p_km_final int,
  p_combustible_regreso fuel_level,
  p_incidencias_regreso text,
  p_danios jsonb,
  p_firma_url text,
  p_gps_lat double precision,
  p_gps_lng double precision,
  p_voucher jsonb,
  p_user_agent text default null,
  p_incidencia_fotos jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_bitacora record;
  v_snapshot jsonb;
  v_hash text;
  v_danio jsonb;
  v_merged_fotos jsonb;
begin
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;
  v_org_id := auth_org_id();

  select * into v_bitacora from bitacoras where id = p_bitacora_id for update;

  if v_bitacora is null then
    raise exception 'Viaje no encontrado.';
  end if;
  if v_bitacora.organization_id <> v_org_id then
    raise exception 'Este viaje no pertenece a tu organización.';
  end if;
  if v_bitacora.estado <> 'abierta' then
    raise exception 'Este viaje ya fue cerrado anteriormente.';
  end if;

  v_merged_fotos := coalesce(v_bitacora.incidencia_fotos, '[]'::jsonb) || coalesce(p_incidencia_fotos, '[]'::jsonb);

  update bitacoras set
    km_final = p_km_final, combustible_regreso = p_combustible_regreso, incidencias_regreso = p_incidencias_regreso,
    incidencia_fotos = v_merged_fotos, firma_regreso_url = p_firma_url, gps_lat_regreso = p_gps_lat, gps_lng_regreso = p_gps_lng,
    estado = 'cerrada', closed_by = v_user_id, closed_at = now()
  where id = p_bitacora_id;

  if p_danios is not null then
    for v_danio in select * from jsonb_array_elements(p_danios)
    loop
      insert into bitacora_danios (organization_id, bitacora_id, zona, nota, foto_url)
      values (v_org_id, p_bitacora_id, v_danio->>'zone', v_danio->>'note', v_danio->>'fotoUrl');
    end loop;
  end if;

  if p_voucher is not null then
    insert into fuel_vouchers (organization_id, bitacora_id, vehicle_id, user_id, imagen_url, litros, monto, estacion, folio, ocr_confidence, fecha_ticket, proyecto)
    values (
      v_org_id, p_bitacora_id, v_bitacora.vehicle_id, v_user_id,
      p_voucher->>'imagenUrl',
      nullif(p_voucher->>'litros', '')::numeric,
      nullif(p_voucher->>'monto', '')::numeric,
      p_voucher->>'estacion', p_voucher->>'folio',
      coalesce(nullif(p_voucher->>'ocrConfidence', ''), 'Media'),
      nullif(p_voucher->>'fecha', '')::timestamptz,
      v_bitacora.proyecto
    );
  end if;

  update vehicles set status = 'disponible'::vehicle_status, km = coalesce(p_km_final, km), fuel = coalesce(p_combustible_regreso, fuel)
  where id = v_bitacora.vehicle_id;

  select jsonb_build_object(
    'evento', 'CHECK_IN_REGRESO', 'bitacora_id', p_bitacora_id, 'vehicle_id', v_bitacora.vehicle_id,
    'user_id_salida', v_bitacora.user_id, 'user_id_regreso', v_user_id, 'proyecto', v_bitacora.proyecto,
    'km_inicial', v_bitacora.km_inicial, 'km_final', p_km_final, 'combustible_regreso', p_combustible_regreso,
    'incidencias_regreso', p_incidencias_regreso, 'incidencia_fotos_regreso', p_incidencia_fotos, 'danios_regreso', p_danios,
    'firma_regreso_url', p_firma_url, 'gps_regreso', jsonb_build_object('lat', p_gps_lat, 'lng', p_gps_lng),
    'voucher', p_voucher, 'user_agent', p_user_agent, 'timestamp_servidor', now()
  ) into v_snapshot;

  v_hash := encode(digest(v_snapshot::text, 'sha256'), 'hex');
  insert into auditoria_logs (organization_id, bitacora_id, snapshot, hash, created_at) values (v_org_id, p_bitacora_id, v_snapshot, v_hash, now());

  return jsonb_build_object('bitacora_id', p_bitacora_id, 'hash', v_hash);
end;
$$;

-- ----------------------------------------------------------
-- admin_force_close_bitacora — mismo candado de organización.
-- ----------------------------------------------------------
create or replace function public.admin_force_close_bitacora(
  p_bitacora_id uuid,
  p_km_final int,
  p_nota_admin text
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_role user_role;
  v_org_id uuid;
  v_bitacora record;
  v_snapshot jsonb;
  v_hash text;
begin
  if v_caller_id is null then raise exception 'No autenticado'; end if;
  select role into v_caller_role from profiles where id = v_caller_id;
  if v_caller_role is distinct from 'administrador' then
    raise exception 'Solo un administrador puede forzar el cierre de un viaje.';
  end if;
  v_org_id := auth_org_id();

  select * into v_bitacora from bitacoras where id = p_bitacora_id for update;
  if v_bitacora is null then raise exception 'Viaje no encontrado.'; end if;
  if v_bitacora.organization_id <> v_org_id then raise exception 'Este viaje no pertenece a tu organización.'; end if;
  if v_bitacora.estado <> 'abierta' then raise exception 'Este viaje ya fue cerrado anteriormente.'; end if;

  update bitacoras set
    km_final = coalesce(p_km_final, v_bitacora.km_inicial),
    incidencias_regreso = trim(both E'\n' from
      coalesce(v_bitacora.incidencias_regreso, '') ||
      case when p_nota_admin is not null and p_nota_admin <> '' then E'\n[Cierre administrativo] ' || p_nota_admin else '' end
    ),
    estado = 'cerrada', closed_by = v_caller_id, closed_at = now()
  where id = p_bitacora_id;

  update vehicles set status = 'disponible'::vehicle_status, km = coalesce(p_km_final, km) where id = v_bitacora.vehicle_id;

  select jsonb_build_object(
    'evento', 'CIERRE_ADMINISTRATIVO', 'bitacora_id', p_bitacora_id, 'vehicle_id', v_bitacora.vehicle_id,
    'user_id_salida', v_bitacora.user_id, 'cerrado_por_admin', v_caller_id,
    'km_inicial', v_bitacora.km_inicial, 'km_final', p_km_final, 'nota_admin', p_nota_admin, 'timestamp_servidor', now()
  ) into v_snapshot;

  v_hash := encode(digest(v_snapshot::text, 'sha256'), 'hex');
  insert into auditoria_logs (organization_id, bitacora_id, snapshot, hash, created_at) values (v_org_id, p_bitacora_id, v_snapshot, v_hash, now());

  return jsonb_build_object('bitacora_id', p_bitacora_id, 'hash', v_hash);
end;
$$;

-- ----------------------------------------------------------
-- Correcciones de Caja Negra — también validan organización.
-- ----------------------------------------------------------
create or replace function public.admin_annotate_audit_log(p_log_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role user_role;
  v_org_id uuid;
  v_log_org uuid;
  v_existing text;
begin
  select role into v_caller_role from profiles where id = auth.uid();
  if v_caller_role is distinct from 'administrador' then
    raise exception 'Solo un administrador puede anotar una corrección.';
  end if;
  if p_note is null or trim(p_note) = '' then
    raise exception 'La nota de corrección no puede estar vacía.';
  end if;

  v_org_id := auth_org_id();
  select organization_id, correction_note into v_log_org, v_existing from auditoria_logs where id = p_log_id;
  if v_log_org is distinct from v_org_id then
    raise exception 'Este registro no pertenece a tu organización.';
  end if;

  update auditoria_logs set
    corrected_by = auth.uid(), corrected_at = now(),
    correction_note = coalesce(v_existing || E'\n\n', '') || '[' || to_char(now(), 'YYYY-MM-DD HH24:MI') || '] ' || trim(p_note)
  where id = p_log_id;
end;
$$;

create or replace function public.admin_hide_audit_log(p_log_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role user_role;
  v_org_id uuid;
  v_log_org uuid;
begin
  select role into v_caller_role from profiles where id = auth.uid();
  if v_caller_role is distinct from 'administrador' then
    raise exception 'Solo un administrador puede ocultar un registro.';
  end if;
  if p_reason is null or trim(p_reason) = '' then
    raise exception 'Debes indicar un motivo para ocultar el registro.';
  end if;

  v_org_id := auth_org_id();
  select organization_id into v_log_org from auditoria_logs where id = p_log_id;
  if v_log_org is distinct from v_org_id then
    raise exception 'Este registro no pertenece a tu organización.';
  end if;

  update auditoria_logs set hidden_by = auth.uid(), hidden_at = now(), hidden_reason = trim(p_reason) where id = p_log_id;
end;
$$;

create or replace function public.admin_restore_audit_log(p_log_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role user_role;
  v_org_id uuid;
  v_log_org uuid;
begin
  select role into v_caller_role from profiles where id = auth.uid();
  if v_caller_role is distinct from 'administrador' then
    raise exception 'Solo un administrador puede restaurar un registro.';
  end if;

  v_org_id := auth_org_id();
  select organization_id into v_log_org from auditoria_logs where id = p_log_id;
  if v_log_org is distinct from v_org_id then
    raise exception 'Este registro no pertenece a tu organización.';
  end if;

  update auditoria_logs set hidden_by = null, hidden_at = null, hidden_reason = null where id = p_log_id;
end;
$$;
