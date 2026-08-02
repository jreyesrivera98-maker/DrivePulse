-- ==========================================================
-- 0003_submit_bitacora_function.sql
--
-- Registra una bitácora completa (check-in/out) de forma ATÓMICA:
--   1) inserta la bitácora
--   2) inserta sus desperfectos (bitacora_danios)
--   3) inserta el voucher de combustible, si lo hay
--   4) actualiza status/km/fuel del vehículo (único cambio de
--      flotilla que un colaborador no-administrador puede provocar,
--      y solo a través de esta función — nunca con UPDATE directo,
--      la policy de vehicles sigue restringida a admin)
--   5) genera el snapshot JSONB inmutable + hash y lo guarda en
--      auditoria_logs, con TIMESTAMP ESTRICTO DEL SERVIDOR (now()),
--      no del reloj del navegador del colaborador.
--
-- SECURITY DEFINER: corre con privilegios elevados para poder tocar
-- `vehicles` y `auditoria_logs` de forma controlada, pero valida que
-- exista un usuario autenticado y solo expone los campos que este
-- flujo debe poder cambiar.
-- ==========================================================

create extension if not exists pgcrypto;

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
  p_voucher jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_bitacora_id uuid;
  v_snapshot jsonb;
  v_hash text;
  v_danio jsonb;
  v_new_status vehicle_status;
begin
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  if p_tipo not in ('salida', 'regreso') then
    raise exception 'Tipo de bitácora inválido: %', p_tipo;
  end if;

  insert into bitacoras (
    vehicle_id, user_id, tipo, proyecto, destino, autorizado_por,
    km_inicial, km_final, combustible_salida, combustible_regreso,
    limpieza, incidencias, firma_url, gps_lat, gps_lng, created_at
  ) values (
    p_vehicle_id, v_user_id, p_tipo, p_proyecto, p_destino, p_autorizado_por,
    p_km_inicial, p_km_final, p_combustible_salida, p_combustible_regreso,
    p_limpieza, p_incidencias, p_firma_url, p_gps_lat, p_gps_lng, now()
  ) returning id into v_bitacora_id;

  if p_danios is not null then
    for v_danio in select * from jsonb_array_elements(p_danios)
    loop
      insert into bitacora_danios (bitacora_id, zona, nota, foto_url)
      values (
        v_bitacora_id,
        v_danio->>'zone',
        v_danio->>'note',
        v_danio->>'fotoUrl'
      );
    end loop;
  end if;

  if p_voucher is not null then
    insert into fuel_vouchers (bitacora_id, vehicle_id, imagen_url, litros, monto, estacion, fecha_ticket, proyecto)
    values (
      v_bitacora_id, p_vehicle_id,
      p_voucher->>'imagenUrl',
      nullif(p_voucher->>'litros', '')::numeric,
      nullif(p_voucher->>'monto', '')::numeric,
      p_voucher->>'estacion',
      nullif(p_voucher->>'fecha', '')::timestamptz,
      p_proyecto
    );
  end if;

  v_new_status := case when p_tipo = 'salida' then 'en_uso'::vehicle_status else 'disponible'::vehicle_status end;

  update vehicles set
    status = v_new_status,
    km = coalesce(p_km_final, p_km_inicial, km),
    fuel = coalesce(p_combustible_regreso, p_combustible_salida, fuel)
  where id = p_vehicle_id;

  select jsonb_build_object(
    'bitacora_id', v_bitacora_id,
    'vehicle_id', p_vehicle_id,
    'user_id', v_user_id,
    'tipo', p_tipo,
    'proyecto', p_proyecto,
    'destino', p_destino,
    'autorizado_por', p_autorizado_por,
    'km_inicial', p_km_inicial,
    'km_final', p_km_final,
    'combustible_salida', p_combustible_salida,
    'combustible_regreso', p_combustible_regreso,
    'limpieza', p_limpieza,
    'incidencias', p_incidencias,
    'danios', p_danios,
    'firma_url', p_firma_url,
    'gps', jsonb_build_object('lat', p_gps_lat, 'lng', p_gps_lng),
    'voucher', p_voucher,
    'timestamp_servidor', now()
  ) into v_snapshot;

  v_hash := encode(digest(v_snapshot::text, 'sha256'), 'hex');

  insert into auditoria_logs (bitacora_id, snapshot, hash, created_at)
  values (v_bitacora_id, v_snapshot, v_hash, now());

  return jsonb_build_object('bitacora_id', v_bitacora_id, 'hash', v_hash);
end;
$$;

grant execute on function public.submit_bitacora(
  uuid, text, text, text, text, int, int, fuel_level, fuel_level,
  boolean, text, jsonb, text, double precision, double precision, jsonb
) to authenticated;
