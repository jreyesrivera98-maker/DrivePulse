-- ==========================================================
-- 0021_bloqueo_reserva_checkout_pendiente.sql
--
-- Problema de adopción: el trabajador entrega las llaves, da por
-- terminado el viaje mentalmente y olvida hacer el check-in en la
-- app. La bitácora se queda "abierta" indefinidamente.
--
-- Regla de negocio: NINGÚN colaborador puede tener una segunda
-- reserva mientras tenga un viaje (bitácora) sin cerrar, sin
-- importar en qué vehículo haya quedado abierto ese viaje.
--
-- Esto se implementa como trigger en la tabla `reservations`, NO
-- solo como validación en el frontend, porque:
--   1. Debe cumplirse aunque la reserva se cree desde el panel de
--      administrador (asignando a otro colaborador), no solo en el
--      flujo de autoservicio del trabajador.
--   2. Debe cumplirse aunque alguien llame a la API de Supabase
--      directamente, sin pasar por la UI de React.
-- El frontend agrega una capa adicional (useMyOpenBitacora) para
-- avisar ANTES de que el usuario llene el formulario, pero la regla
-- real e innegociable vive aquí.
-- ==========================================================

create or replace function public.block_reservation_if_open_bitacora()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_vehicle_plate text;
  v_vehicle_id uuid;
begin
  -- Solo evaluamos cuando se define/cambia el colaborador de la
  -- reserva: un INSERT nuevo, o un UPDATE que reasigna user_id a
  -- otra persona. No se evalúa en reprogramaciones (drag & drop de
  -- fecha/vehículo) que no tocan user_id, para no romper el flujo
  -- de mover reservas ya existentes.
  if TG_OP = 'UPDATE' and NEW.user_id is not distinct from OLD.user_id then
    return NEW;
  end if;

  select b.vehicle_id, v.plate
    into v_vehicle_id, v_vehicle_plate
  from bitacoras b
  join vehicles v on v.id = b.vehicle_id
  where b.user_id = NEW.user_id
    and b.estado = 'abierta'
  limit 1;

  if v_vehicle_id is not null then
    raise exception
      'Este colaborador tiene un viaje sin cerrar en la unidad %. Debe completar el check-in (cierre de bitácora) antes de poder reservar otro vehículo.',
      coalesce(v_vehicle_plate, v_vehicle_id::text)
      using errcode = 'P0001';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_block_reservation_open_bitacora on reservations;
create trigger trg_block_reservation_open_bitacora
  before insert or update on reservations
  for each row execute function public.block_reservation_if_open_bitacora();

comment on function public.block_reservation_if_open_bitacora() is
  'Bloqueo estricto: impide crear o reasignar una reserva a un colaborador que tenga un check-out (bitácora) pendiente de cerrar, en cualquier vehículo. Regla de negocio no evadible desde el cliente.';
