-- ==========================================================
-- 0013_admin_force_close_bitacora.sql
--
-- Válvula de emergencia: si un viaje se queda abierto por algún
-- error (el colaborador no puede completar su check-in, perdió el
-- teléfono, etc.), un administrador puede cerrarlo directamente
-- desde Reservas — sin necesitar firma ni foto, pero dejando un
-- registro de auditoría claramente marcado como "cierre
-- administrativo" (evento distinto a un check-in real del
-- conductor), para que quede transparente en la Caja Negra que no
-- fue el colaborador quien lo cerró.
-- ==========================================================

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
  v_bitacora record;
  v_snapshot jsonb;
  v_hash text;
begin
  if v_caller_id is null then
    raise exception 'No autenticado';
  end if;

  select role into v_caller_role from profiles where id = v_caller_id;
  if v_caller_role is distinct from 'administrador' then
    raise exception 'Solo un administrador puede forzar el cierre de un viaje.';
  end if;

  select * into v_bitacora from bitacoras where id = p_bitacora_id for update;
  if v_bitacora is null then
    raise exception 'Viaje no encontrado.';
  end if;
  if v_bitacora.estado <> 'abierta' then
    raise exception 'Este viaje ya fue cerrado anteriormente.';
  end if;

  update bitacoras set
    km_final = coalesce(p_km_final, v_bitacora.km_inicial),
    incidencias_regreso = trim(both E'\n' from
      coalesce(v_bitacora.incidencias_regreso, '') ||
      case when p_nota_admin is not null and p_nota_admin <> ''
        then E'\n[Cierre administrativo] ' || p_nota_admin
        else ''
      end
    ),
    estado = 'cerrada',
    closed_by = v_caller_id,
    closed_at = now()
  where id = p_bitacora_id;

  update vehicles set
    status = 'disponible'::vehicle_status,
    km = coalesce(p_km_final, km)
  where id = v_bitacora.vehicle_id;

  select jsonb_build_object(
    'evento', 'CIERRE_ADMINISTRATIVO',
    'bitacora_id', p_bitacora_id,
    'vehicle_id', v_bitacora.vehicle_id,
    'user_id_salida', v_bitacora.user_id,
    'cerrado_por_admin', v_caller_id,
    'km_inicial', v_bitacora.km_inicial,
    'km_final', p_km_final,
    'nota_admin', p_nota_admin,
    'timestamp_servidor', now()
  ) into v_snapshot;

  v_hash := encode(digest(v_snapshot::text, 'sha256'), 'hex');
  insert into auditoria_logs (bitacora_id, snapshot, hash, created_at) values (p_bitacora_id, v_snapshot, v_hash, now());

  return jsonb_build_object('bitacora_id', p_bitacora_id, 'hash', v_hash);
end;
$$;

grant execute on function public.admin_force_close_bitacora(uuid, int, text) to authenticated;
