-- ==========================================================
-- 0017_multi_tenancy_rls.sql  (2/3)
--
-- Reemplaza TODAS las políticas de seguridad existentes por
-- versiones que además de validar el rol, validan que el dato
-- pertenezca a la organización del usuario autenticado. Sin esto,
-- el paso 1 (agregar la columna) no serviría de nada — cualquiera
-- podría seguir viendo datos de otra empresa.
-- ==========================================================

-- ---------- ORGANIZATIONS ----------
create policy "usuario ve su propia organizacion"
  on organizations for select
  using (id = auth_org_id());

-- (No hay policy de insert/update/delete pública aquí a propósito —
-- crear una organización nueva se hace vía la función
-- create_organization() de la migración 0018, que corre con
-- privilegios elevados y controla el proceso completo.)

-- ---------- PROFILES ----------
drop policy if exists "todos los autenticados leen perfiles" on profiles;
create policy "usuarios leen perfiles de su organizacion"
  on profiles for select
  using (organization_id = auth_org_id());

drop policy if exists "solo admin crea/edita/borra usuarios" on profiles;
create policy "admin CRUD de usuarios de su organizacion"
  on profiles for all
  using (auth_role() = 'administrador' and organization_id = auth_org_id())
  with check (auth_role() = 'administrador' and organization_id = auth_org_id());

drop policy if exists "usuario actualiza su propio perfil" on profiles;
create policy "usuario actualiza su propio perfil"
  on profiles for update
  using (auth.uid() = id and organization_id = auth_org_id())
  with check (auth.uid() = id and organization_id = auth_org_id());

-- ---------- VEHICLES ----------
drop policy if exists "todos los autenticados leen vehiculos" on vehicles;
create policy "usuarios leen vehiculos de su organizacion"
  on vehicles for select using (organization_id = auth_org_id());

drop policy if exists "solo admin inserta vehiculos" on vehicles;
create policy "admin inserta vehiculos en su organizacion"
  on vehicles for insert with check (auth_role() = 'administrador' and (organization_id = auth_org_id() or organization_id is null));

drop policy if exists "solo admin actualiza vehiculos" on vehicles;
create policy "admin actualiza vehiculos de su organizacion"
  on vehicles for update using (auth_role() = 'administrador' and organization_id = auth_org_id());

drop policy if exists "solo admin elimina vehiculos" on vehicles;
create policy "admin elimina vehiculos de su organizacion"
  on vehicles for delete using (auth_role() = 'administrador' and organization_id = auth_org_id());

-- ---------- RESERVATIONS ----------
drop policy if exists "todos leen reservas" on reservations;
create policy "usuarios leen reservas de su organizacion"
  on reservations for select using (organization_id = auth_org_id());

drop policy if exists "trabajador crea su propia reserva, admin crea cualquiera" on reservations;
create policy "crear reserva dentro de la propia organizacion"
  on reservations for insert
  with check (
    (organization_id = auth_org_id() or organization_id is null)
    and (auth_role() = 'administrador' or user_id = auth.uid())
  );

drop policy if exists "solo admin reprograma o edita cualquier reserva" on reservations;
create policy "admin edita reservas de su organizacion"
  on reservations for update using (auth_role() = 'administrador' and organization_id = auth_org_id());

drop policy if exists "solo admin elimina reservas" on reservations;
create policy "admin elimina reservas de su organizacion"
  on reservations for delete using (auth_role() = 'administrador' and organization_id = auth_org_id());

-- ---------- BITACORAS ----------
drop policy if exists "todos los autenticados leen bitacoras" on bitacoras;
create policy "usuarios leen bitacoras de su organizacion"
  on bitacoras for select using (organization_id = auth_org_id());

drop policy if exists "trabajador y admin crean bitacoras" on bitacoras;
create policy "crear bitacora dentro de la propia organizacion"
  on bitacoras for insert
  with check (auth.uid() is not null and (organization_id = auth_org_id() or organization_id is null));

drop policy if exists "admin edita bitacoras" on bitacoras;
create policy "admin edita bitacoras de su organizacion"
  on bitacoras for update using (auth_role() = 'administrador' and organization_id = auth_org_id());

drop policy if exists "admin elimina bitacoras" on bitacoras;
create policy "admin elimina bitacoras de su organizacion"
  on bitacoras for delete using (auth_role() = 'administrador' and organization_id = auth_org_id());

-- ---------- BITACORA_DANIOS ----------
drop policy if exists "todos los autenticados leen danios" on bitacora_danios;
create policy "usuarios leen danios de su organizacion"
  on bitacora_danios for select using (organization_id = auth_org_id());

drop policy if exists "usuario autenticado registra danios de su bitacora" on bitacora_danios;
create policy "crear danio dentro de la propia organizacion"
  on bitacora_danios for insert
  with check (auth.uid() is not null and (organization_id = auth_org_id() or organization_id is null));

-- ---------- FUEL_VOUCHERS ----------
drop policy if exists "admin ve todos los vouchers, trabajador ve los suyos" on fuel_vouchers;
create policy "admin ve todos, trabajador ve los suyos, misma organizacion"
  on fuel_vouchers for select
  using (organization_id = auth_org_id() and (auth_role() = 'administrador' or user_id = auth.uid()));

drop policy if exists "usuario autenticado registra su propio voucher" on fuel_vouchers;
create policy "crear voucher propio dentro de la propia organizacion"
  on fuel_vouchers for insert
  with check (user_id = auth.uid() and (organization_id = auth_org_id() or organization_id is null));

-- ---------- AUDITORIA_LOGS ----------
drop policy if exists "solo admin lee auditoria" on auditoria_logs;
create policy "admin lee auditoria de su organizacion"
  on auditoria_logs for select using (auth_role() = 'administrador' and organization_id = auth_org_id());

drop policy if exists "usuario autenticado inserta su propio snapshot" on auditoria_logs;
create policy "crear snapshot dentro de la propia organizacion"
  on auditoria_logs for insert
  with check (auth.uid() is not null and (organization_id = auth_org_id() or organization_id is null));

-- ---------- MAINTENANCE ----------
drop policy if exists "admin CRUD completo mantenimientos" on maintenance;
create policy "admin CRUD mantenimientos de su organizacion"
  on maintenance for all
  using (auth_role() = 'administrador' and organization_id = auth_org_id())
  with check (auth_role() = 'administrador' and (organization_id = auth_org_id() or organization_id is null));

-- ---------- INSPECTIONS ----------
drop policy if exists "admin CRUD completo inspecciones" on inspections;
create policy "admin CRUD inspecciones de su organizacion"
  on inspections for all
  using (auth_role() = 'administrador' and organization_id = auth_org_id())
  with check (auth_role() = 'administrador' and (organization_id = auth_org_id() or organization_id is null));

-- ---------- BRANDING_SETTINGS ----------
drop policy if exists "todos leen branding" on branding_settings;
create policy "usuarios leen branding de su organizacion"
  on branding_settings for select using (organization_id = auth_org_id());

drop policy if exists "solo admin edita branding" on branding_settings;
create policy "admin edita branding de su organizacion"
  on branding_settings for update using (auth_role() = 'administrador' and organization_id = auth_org_id());

create policy "admin inserta branding de su organizacion"
  on branding_settings for insert
  with check (auth_role() = 'administrador' and (organization_id = auth_org_id() or organization_id is null));

-- ---------- GPS_INTEGRATION_SETTINGS ----------
drop policy if exists "solo admin lee configuracion gps" on gps_integration_settings;
create policy "admin lee config gps de su organizacion"
  on gps_integration_settings for select using (auth_role() = 'administrador' and organization_id = auth_org_id());

drop policy if exists "solo admin edita configuracion gps" on gps_integration_settings;
create policy "admin edita config gps de su organizacion"
  on gps_integration_settings for update using (auth_role() = 'administrador' and organization_id = auth_org_id());

create policy "admin inserta config gps de su organizacion"
  on gps_integration_settings for insert
  with check (auth_role() = 'administrador' and (organization_id = auth_org_id() or organization_id is null));
