-- ==========================================================
-- 0011_bitacora_dos_fases.sql
--
-- Hasta ahora, check-out y check-in generaban DOS registros
-- desconectados en `bitacoras` (sin relación entre sí). Esto agrega
-- el concepto real de "viaje": se abre con el check-out y se CIERRA
-- (mismo registro) con el check-in — nunca se pierde quién hizo la
-- salida original, aunque otra persona registre el regreso.
-- ==========================================================

alter table bitacoras add column if not exists estado text not null default 'abierta' check (estado in ('abierta', 'cerrada'));
alter table bitacoras add column if not exists closed_by uuid references profiles(id);
alter table bitacoras add column if not exists closed_at timestamptz;
alter table bitacoras add column if not exists incidencias_regreso text;
alter table bitacoras add column if not exists firma_regreso_url text;
alter table bitacoras add column if not exists gps_lat_regreso double precision;
alter table bitacoras add column if not exists gps_lng_regreso double precision;

-- Backfill de registros ya existentes: si ya tenían km_final, se
-- consideran cerrados; si no, siguen abiertos. (Los pares
-- salida/regreso creados como registros separados ANTES de esta
-- migración no se pueden reconectar retroactivamente — es una
-- limitación conocida de los datos históricos, no de los nuevos.)
update bitacoras set estado = case when km_final is not null then 'cerrada' else 'abierta' end;

-- Un vehículo no puede tener dos viajes abiertos a la vez.
create unique index if not exists idx_bitacoras_un_viaje_abierto
  on bitacoras (vehicle_id)
  where estado = 'abierta';

-- submit_bitacora ahora SIEMPRE crea el registro en estado 'abierta'
-- (es el check-out). El cierre (check-in) usa la función nueva de
-- abajo. El signature no cambia, así que no hace falta hacer DROP.
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
  v_bitacora_id uuid;
  v_snapshot jsonb;
  v_hash text;
  v_danio jsonb;
begin
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  if exists (select 1 from bitacoras where vehicle_id = p_vehicle_id and estado = 'abierta') then
    raise exception 'Este vehículo ya tiene un viaje abierto. Debe cerrarse (check-in) antes de registrar una nueva salida.';
  end if;

  insert into bitacoras (
    vehicle_id, user_id, tipo, proyecto, destino, autorizado_por,
    km_inicial, km_final, combustible_salida, combustible_regreso,
    limpieza, incidencias, incidencia_fotos, firma_url, gps_lat, gps_lng,
    estado, created_at
  ) values (
    p_vehicle_id, v_user_id, 'salida', p_proyecto, p_destino, p_autorizado_por,
    p_km_inicial, null, p_combustible_salida, null,
    p_limpieza, p_incidencias, coalesce(p_incidencia_fotos, '[]'::jsonb), p_firma_url, p_gps_lat, p_gps_lng,
    'abierta', now()
  ) returning id into v_bitacora_id;

  if p_danios is not null then
    for v_danio in select * from jsonb_array_elements(p_danios)
    loop
      insert into bitacora_danios (bitacora_id, zona, nota, foto_url)
      values (v_bitacora_id, v_danio->>'zone', v_danio->>'note', v_danio->>'fotoUrl');
    end loop;
  end if;

  if p_voucher is not null then
    insert into fuel_vouchers (bitacora_id, vehicle_id, user_id, imagen_url, litros, monto, estacion, folio, ocr_confidence, fecha_ticket, proyecto)
    values (
      v_bitacora_id, p_vehicle_id, v_user_id,
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
    'evento', 'CHECK_OUT_INICIO',
    'bitacora_id', v_bitacora_id,
    'vehicle_id', p_vehicle_id,
    'user_id', v_user_id,
    'proyecto', p_proyecto,
    'destino', p_destino,
    'autorizado_por', p_autorizado_por,
    'km_inicial', p_km_inicial,
    'combustible_salida', p_combustible_salida,
    'limpieza', p_limpieza,
    'incidencias', p_incidencias,
    'incidencia_fotos', p_incidencia_fotos,
    'danios', p_danios,
    'firma_url', p_firma_url,
    'gps', jsonb_build_object('lat', p_gps_lat, 'lng', p_gps_lng),
    'voucher', p_voucher,
    'user_agent', p_user_agent,
    'timestamp_servidor', now()
  ) into v_snapshot;

  v_hash := encode(digest(v_snapshot::text, 'sha256'), 'hex');
  insert into auditoria_logs (bitacora_id, snapshot, hash, created_at) values (v_bitacora_id, v_snapshot, v_hash, now());

  return jsonb_build_object('bitacora_id', v_bitacora_id, 'hash', v_hash);
end;
$$;

-- ==========================================================
-- close_bitacora: cierra un viaje abierto (check-in). No borra ni
-- modifica el snapshot de auditoría del check-out original — genera
-- UNO NUEVO propio para el cierre, igual de inmutable.
-- ==========================================================
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
  v_bitacora record;
  v_snapshot jsonb;
  v_hash text;
  v_danio jsonb;
  v_merged_fotos jsonb;
begin
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  select * into v_bitacora from bitacoras where id = p_bitacora_id for update;

  if v_bitacora is null then
    raise exception 'Viaje no encontrado.';
  end if;
  if v_bitacora.estado <> 'abierta' then
    raise exception 'Este viaje ya fue cerrado anteriormente.';
  end if;

  v_merged_fotos := coalesce(v_bitacora.incidencia_fotos, '[]'::jsonb) || coalesce(p_incidencia_fotos, '[]'::jsonb);

  update bitacoras set
    km_final = p_km_final,
    combustible_regreso = p_combustible_regreso,
    incidencias_regreso = p_incidencias_regreso,
    incidencia_fotos = v_merged_fotos,
    firma_regreso_url = p_firma_url,
    gps_lat_regreso = p_gps_lat,
    gps_lng_regreso = p_gps_lng,
    estado = 'cerrada',
    closed_by = v_user_id,
    closed_at = now()
  where id = p_bitacora_id;

  if p_danios is not null then
    for v_danio in select * from jsonb_array_elements(p_danios)
    loop
      insert into bitacora_danios (bitacora_id, zona, nota, foto_url)
      values (p_bitacora_id, v_danio->>'zone', v_danio->>'note', v_danio->>'fotoUrl');
    end loop;
  end if;

  if p_voucher is not null then
    insert into fuel_vouchers (bitacora_id, vehicle_id, user_id, imagen_url, litros, monto, estacion, folio, ocr_confidence, fecha_ticket, proyecto)
    values (
      p_bitacora_id, v_bitacora.vehicle_id, v_user_id,
      p_voucher->>'imagenUrl',
      nullif(p_voucher->>'litros', '')::numeric,
      nullif(p_voucher->>'monto', '')::numeric,
      p_voucher->>'estacion', p_voucher->>'folio',
      coalesce(nullif(p_voucher->>'ocrConfidence', ''), 'Media'),
      nullif(p_voucher->>'fecha', '')::timestamptz,
      v_bitacora.proyecto
    );
  end if;

  update vehicles set
    status = 'disponible'::vehicle_status,
    km = coalesce(p_km_final, km),
    fuel = coalesce(p_combustible_regreso, fuel)
  where id = v_bitacora.vehicle_id;

  select jsonb_build_object(
    'evento', 'CHECK_IN_REGRESO',
    'bitacora_id', p_bitacora_id,
    'vehicle_id', v_bitacora.vehicle_id,
    'user_id_salida', v_bitacora.user_id,
    'user_id_regreso', v_user_id,
    'proyecto', v_bitacora.proyecto,
    'km_inicial', v_bitacora.km_inicial,
    'km_final', p_km_final,
    'combustible_regreso', p_combustible_regreso,
    'incidencias_regreso', p_incidencias_regreso,
    'incidencia_fotos_regreso', p_incidencia_fotos,
    'danios_regreso', p_danios,
    'firma_regreso_url', p_firma_url,
    'gps_regreso', jsonb_build_object('lat', p_gps_lat, 'lng', p_gps_lng),
    'voucher', p_voucher,
    'user_agent', p_user_agent,
    'timestamp_servidor', now()
  ) into v_snapshot;

  v_hash := encode(digest(v_snapshot::text, 'sha256'), 'hex');
  insert into auditoria_logs (bitacora_id, snapshot, hash, created_at) values (p_bitacora_id, v_snapshot, v_hash, now());

  return jsonb_build_object('bitacora_id', p_bitacora_id, 'hash', v_hash);
end;
$$;

grant execute on function public.close_bitacora(
  uuid, int, fuel_level, text, jsonb, text, double precision, double precision, jsonb, text, jsonb
) to authenticated;
