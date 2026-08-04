-- ==========================================================
-- 0006_combustible_historico_auditoria.sql
--
-- Habilita 3 cosas nuevas:
--   A) Recargas de combustible independientes de una bitácora
--      (módulo Combustible), con folio y confianza de OCR.
--   B) Que el administrador pueda editar/eliminar bitácoras ya
--      guardadas (módulo Histórico) — esto NO afecta la
--      inmutabilidad de auditoria_logs, que sigue sin policies de
--      UPDATE/DELETE para nadie. El snapshot ya guardado sigue
--      siendo la prueba forense de lo que se capturó originalmente,
--      aunque el registro de trabajo (bitacoras) se corrija después.
--   C) Captura del user agent del dispositivo en el snapshot de
--      auditoría, para el módulo Auditoría.
-- ==========================================================

-- ----------------------------------------------------------
-- A) fuel_vouchers: columnas nuevas + dueño explícito
-- ----------------------------------------------------------
alter table fuel_vouchers add column if not exists user_id uuid references profiles(id);
alter table fuel_vouchers add column if not exists folio text;
alter table fuel_vouchers add column if not exists ocr_confidence text default 'Manual';

-- Si se borra la bitácora que originó el voucher, el voucher debe
-- SOBREVIVIR (es un comprobante fiscal) — solo pierde la referencia.
alter table fuel_vouchers drop constraint if exists fuel_vouchers_bitacora_id_fkey;
alter table fuel_vouchers
  add constraint fuel_vouchers_bitacora_id_fkey
  foreign key (bitacora_id) references bitacoras(id) on delete set null;

-- La policy de lectura original dependía de la bitácora asociada;
-- ahora que puede no existir, se usa la columna user_id directamente.
drop policy if exists "admin ve todos los vouchers, trabajador ve los suyos" on fuel_vouchers;
create policy "admin ve todos los vouchers, trabajador ve los suyos"
  on fuel_vouchers for select
  using (auth_role() = 'administrador' or user_id = auth.uid());

-- Refuerza en la base de datos que nadie registre un voucher a
-- nombre de otra persona (antes solo se exigía estar autenticado).
drop policy if exists "usuario autenticado sube su voucher" on fuel_vouchers;
drop policy if exists "usuario autenticado registra su voucher" on fuel_vouchers;
create policy "usuario autenticado registra su propio voucher"
  on fuel_vouchers for insert
  with check (user_id = auth.uid());

-- ----------------------------------------------------------
-- B) bitacoras: el administrador ya puede editar y eliminar
-- ----------------------------------------------------------
create policy "admin edita bitacoras"
  on bitacoras for update
  using (auth_role() = 'administrador');

create policy "admin elimina bitacoras"
  on bitacoras for delete
  using (auth_role() = 'administrador');

-- Si se borra una bitácora, su snapshot de auditoría NO se borra
-- (sigue siendo la prueba forense inmutable) — solo pierde el enlace
-- directo a un registro de trabajo que ya no existe.
alter table auditoria_logs drop constraint if exists auditoria_logs_bitacora_id_fkey;
alter table auditoria_logs
  add constraint auditoria_logs_bitacora_id_fkey
  foreign key (bitacora_id) references bitacoras(id) on delete set null;

-- ----------------------------------------------------------
-- C) submit_bitacora: agrega user_id/folio/ocr_confidence al
--    voucher, y user_agent al snapshot de auditoría.
--    (El signature cambia porque se agrega p_user_agent, así que
--    se elimina la versión anterior antes de crear la nueva.)
-- ----------------------------------------------------------
drop function if exists public.submit_bitacora(
  uuid, text, text, text, text, int, int, fuel_level, fuel_level,
  boolean, text, jsonb, text, double precision, double precision, jsonb
);

create function public.submit_bitacora(
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
  p_user_agent text default null
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
    insert into fuel_vouchers (bitacora_id, vehicle_id, user_id, imagen_url, litros, monto, estacion, folio, ocr_confidence, fecha_ticket, proyecto)
    values (
      v_bitacora_id, p_vehicle_id, v_user_id,
      p_voucher->>'imagenUrl',
      nullif(p_voucher->>'litros', '')::numeric,
      nullif(p_voucher->>'monto', '')::numeric,
      p_voucher->>'estacion',
      p_voucher->>'folio',
      coalesce(nullif(p_voucher->>'ocrConfidence', ''), 'Media'),
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
    'user_agent', p_user_agent,
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
  boolean, text, jsonb, text, double precision, double precision, jsonb, text
) to authenticated;
