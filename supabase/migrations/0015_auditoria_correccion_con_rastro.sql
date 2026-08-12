-- ==========================================================
-- 0015_auditoria_correccion_con_rastro.sql
--
-- El administrador puede "corregir" (anotar) u "ocultar" un registro
-- de la Caja Negra — nunca editar ni borrar el snapshot/hash
-- originales, que son la prueba forense. Todo queda con rastro de
-- quién lo hizo, cuándo y por qué.
--
-- Por diseño, NO se agregan policies de UPDATE/DELETE directas sobre
-- auditoria_logs — la tabla sigue siendo, a nivel de base de datos,
-- imposible de editar o borrar por cualquier vía normal. Las únicas
-- dos funciones de abajo son la única puerta, y ninguna de las dos
-- toca `snapshot` ni `hash`.
-- ==========================================================

alter table auditoria_logs add column if not exists corrected_by uuid references profiles(id);
alter table auditoria_logs add column if not exists corrected_at timestamptz;
alter table auditoria_logs add column if not exists correction_note text;

alter table auditoria_logs add column if not exists hidden_by uuid references profiles(id);
alter table auditoria_logs add column if not exists hidden_at timestamptz;
alter table auditoria_logs add column if not exists hidden_reason text;

-- ---------- Anotar una corrección (no reemplaza el snapshot) ----------
create or replace function public.admin_annotate_audit_log(p_log_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role user_role;
  v_existing text;
begin
  select role into v_caller_role from profiles where id = auth.uid();
  if v_caller_role is distinct from 'administrador' then
    raise exception 'Solo un administrador puede anotar una corrección.';
  end if;
  if p_note is null or trim(p_note) = '' then
    raise exception 'La nota de corrección no puede estar vacía.';
  end if;

  select correction_note into v_existing from auditoria_logs where id = p_log_id;

  update auditoria_logs set
    corrected_by = auth.uid(),
    corrected_at = now(),
    correction_note = coalesce(v_existing || E'\n\n', '') || '[' || to_char(now(), 'YYYY-MM-DD HH24:MI') || '] ' || trim(p_note)
  where id = p_log_id;

  if not found then
    raise exception 'Registro de auditoría no encontrado.';
  end if;
end;
$$;

-- ---------- Ocultar (soft-delete, nunca borra la fila) ----------
create or replace function public.admin_hide_audit_log(p_log_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role user_role;
begin
  select role into v_caller_role from profiles where id = auth.uid();
  if v_caller_role is distinct from 'administrador' then
    raise exception 'Solo un administrador puede ocultar un registro.';
  end if;
  if p_reason is null or trim(p_reason) = '' then
    raise exception 'Debes indicar un motivo para ocultar el registro.';
  end if;

  update auditoria_logs set
    hidden_by = auth.uid(),
    hidden_at = now(),
    hidden_reason = trim(p_reason)
  where id = p_log_id;

  if not found then
    raise exception 'Registro de auditoría no encontrado.';
  end if;
end;
$$;

-- ---------- Restaurar (deshacer el ocultamiento) ----------
create or replace function public.admin_restore_audit_log(p_log_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role user_role;
begin
  select role into v_caller_role from profiles where id = auth.uid();
  if v_caller_role is distinct from 'administrador' then
    raise exception 'Solo un administrador puede restaurar un registro.';
  end if;

  update auditoria_logs set hidden_by = null, hidden_at = null, hidden_reason = null where id = p_log_id;

  if not found then
    raise exception 'Registro de auditoría no encontrado.';
  end if;
end;
$$;

grant execute on function public.admin_annotate_audit_log(uuid, text) to authenticated;
grant execute on function public.admin_hide_audit_log(uuid, text) to authenticated;
grant execute on function public.admin_restore_audit_log(uuid) to authenticated;
