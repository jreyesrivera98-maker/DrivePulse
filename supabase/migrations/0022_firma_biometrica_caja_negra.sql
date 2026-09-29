-- ==========================================================
-- 0022_firma_biometrica_caja_negra.sql
--
-- Reemplaza la firma gráfica (imagen en Storage) por:
--   Autenticación biométrica nativa (WebAuthn) + Declaración jurada
--   + Auditoría ciega (timestamp + GPS obligatorios).
--
-- Cambios:
--   1. bitacoras.caja_negra_salida / caja_negra_regreso (JSONB) con
--      { timestamp_cierre, declaracion_jurada, metodo_firma,
--        coordenadas_entrega: {lat, lng}, ... }.
--   2. submit_bitacora y close_bitacora dejan de recibir p_firma_url /
--      p_gps_lat / p_gps_lng y reciben p_caja_negra jsonb. Las columnas
--      gps_lat/gps_lng(_regreso) se siguen poblando (derivadas de la caja
--      negra) para no romper mapas ni consultas existentes.
--   3. La caja negra se VALIDA en el servidor (no solo en el frontend):
--      declaración aceptada, método válido y GPS presente.
--   4. Se conservan las columnas firma_url / firma_regreso_url y el bucket
--      `signatures` SOLO como archivo histórico de registros anteriores;
--      los registros nuevos las dejan en NULL.
-- ==========================================================

alter table bitacoras add column if not exists caja_negra_salida jsonb;
alter table bitacoras add column if not exists caja_negra_regreso jsonb;

comment on column bitacoras.caja_negra_salida is
  'Auditoría ciega del check-out: timestamp_cierre, declaracion_jurada, metodo_firma (biometrica|ciega), coordenadas_entrega {lat,lng}, evidencia WebAuthn.';
comment on column bitacoras.caja_negra_regreso is
  'Auditoría ciega del check-in. Misma estructura que caja_negra_salida.';

-- ----------------------------------------------------------
-- Validación reutilizable de la caja negra
-- ----------------------------------------------------------
create or replace function public.assert_caja_negra_valida(p_caja jsonb)
returns void
language plpgsql
as $$
begin
  if p_caja is null or jsonb_typeof(p_caja) <> 'object' then
    raise exception 'Falta la auditoría del cierre (caja negra).';
  end if;
  if coalesce((p_caja->>'declaracion_jurada')::boolean, false) is not true then
    raise exception 'Debes aceptar la declaración jurada para cerrar el registro.';
  end if;
  if coalesce(p_caja->>'metodo_firma', '') not in ('biometrica', 'ciega') then
    raise exception 'Método de firma inválido.';
  end if;
  if coalesce(p_caja->>'timestamp_cierre', '') = '' then
    raise exception 'Falta la marca de tiempo del cierre.';
  end if;
  if (p_caja->'coordenadas_entrega'->>'lat') is null or (p_caja->'coordenadas_entrega'->>'lng') is null then
    raise exception 'La ubicación GPS es obligatoria para registrar la entrega del vehículo.';
  end if;
end;
$$;

-- ----------------------------------------------------------
-- Las firmas cambian (se quita p_firma_url / p_gps_*, se agrega
-- p_caja_negra), así que hay que eliminar las versiones anteriores:
-- con CREATE OR REPLACE quedarían como sobrecargas viejas invocables.
-- ----------------------------------------------------------
drop function if exists public.submit_bitacora(
  uuid, text, text, text, text, int, int, fuel_level, fuel_level, boolean, text, jsonb,
  text, double precision, double precision, jsonb, text, jsonb
);
drop function if exists public.close_bitacora(
  uuid, int, fuel_level, text, jsonb, text, double precision, double precision, jsonb, text, jsonb
);

-- ----------------------------------------------------------
-- submit_bitacora (CHECK-OUT)
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
  p_caja_negra jsonb,
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
  v_lat double precision;
  v_lng double precision;
begin
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  v_org_id := auth_org_id();
  if v_org_id is null then
    raise exception 'Tu cuenta todavía no pertenece a ninguna organización.';
  end if;

  perform assert_caja_negra_valida(p_caja_negra);
  v_lat := (p_caja_negra->'coordenadas_entrega'->>'lat')::double precision;
  v_lng := (p_caja_negra->'coordenadas_entrega'->>'lng')::double precision;

  if not exists (select 1 from vehicles where id = p_vehicle_id and organization_id = v_org_id) then
    raise exception 'Este vehículo no pertenece a tu organización.';
  end if;

  if exists (select 1 from bitacoras where vehicle_id = p_vehicle_id and estado = 'abierta') then
    raise exception 'Este vehículo ya tiene un viaje abierto. Debe cerrarse (check-in) antes de registrar una nueva salida.';
  end if;

  insert into bitacoras (
    organization_id, vehicle_id, user_id, tipo, proyecto, destino, autorizado_por,
    km_inicial, km_final, combustible_salida, combustible_regreso,
    limpieza, incidencias, incidencia_fotos, caja_negra_salida, gps_lat, gps_lng,
    estado, created_at
  ) values (
    v_org_id, p_vehicle_id, v_user_id, 'salida', p_proyecto, p_destino, p_autorizado_por,
    p_km_inicial, null, p_combustible_salida, null,
    p_limpieza, p_incidencias, coalesce(p_incidencia_fotos, '[]'::jsonb), p_caja_negra, v_lat, v_lng,
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
    'caja_negra', p_caja_negra, 'gps', jsonb_build_object('lat', v_lat, 'lng', v_lng),
    'voucher', p_voucher, 'user_agent', p_user_agent, 'timestamp_servidor', now()
  ) into v_snapshot;

  v_hash := encode(digest(v_snapshot::text, 'sha256'), 'hex');
  insert into auditoria_logs (organization_id, bitacora_id, snapshot, hash, created_at) values (v_org_id, v_bitacora_id, v_snapshot, v_hash, now());

  return jsonb_build_object('bitacora_id', v_bitacora_id, 'hash', v_hash);
end;
$$;

-- ----------------------------------------------------------
-- close_bitacora (CHECK-IN)
-- ----------------------------------------------------------
create or replace function public.close_bitacora(
  p_bitacora_id uuid,
  p_km_final int,
  p_combustible_regreso fuel_level,
  p_incidencias_regreso text,
  p_danios jsonb,
  p_caja_negra jsonb,
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
  v_lat double precision;
  v_lng double precision;
begin
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;
  v_org_id := auth_org_id();

  perform assert_caja_negra_valida(p_caja_negra);
  v_lat := (p_caja_negra->'coordenadas_entrega'->>'lat')::double precision;
  v_lng := (p_caja_negra->'coordenadas_entrega'->>'lng')::double precision;

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
    incidencia_fotos = v_merged_fotos, caja_negra_regreso = p_caja_negra, gps_lat_regreso = v_lat, gps_lng_regreso = v_lng,
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
    'caja_negra', p_caja_negra, 'gps_regreso', jsonb_build_object('lat', v_lat, 'lng', v_lng),
    'voucher', p_voucher, 'user_agent', p_user_agent, 'timestamp_servidor', now()
  ) into v_snapshot;

  v_hash := encode(digest(v_snapshot::text, 'sha256'), 'hex');
  insert into auditoria_logs (organization_id, bitacora_id, snapshot, hash, created_at) values (v_org_id, p_bitacora_id, v_snapshot, v_hash, now());

  return jsonb_build_object('bitacora_id', p_bitacora_id, 'hash', v_hash);
end;
$$;

grant execute on function public.submit_bitacora(
  uuid, text, text, text, text, int, int, fuel_level, fuel_level, boolean, text, jsonb,
  jsonb, jsonb, text, jsonb
) to authenticated;

grant execute on function public.close_bitacora(
  uuid, int, fuel_level, text, jsonb, jsonb, jsonb, text, jsonb
) to authenticated;

-- Que PostgREST recargue el esquema y vea las nuevas firmas de RPC.
notify pgrst, 'reload schema';
