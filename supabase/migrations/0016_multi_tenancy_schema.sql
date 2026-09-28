-- ==========================================================
-- 0016_multi_tenancy_schema.sql  (1/3)
--
-- Convierte DrivePulse de "una sola empresa" a multi-tenant: cada
-- fila de cada tabla pasa a pertenecer a una organización, y ningún
-- usuario puede ver ni tocar datos de una organización que no sea
-- la suya.
--
-- Los datos que YA existen (Energía Secing) se migran automáticamente
-- a una organización nueva creada aquí mismo, así que no se pierde
-- nada ni se rompe el acceso de tu equipo actual.
-- ==========================================================

-- ----------------------------------------------------------
-- 1) Tabla de organizaciones (= clientes de DrivePulse)
-- ----------------------------------------------------------
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  plan text not null default 'trial',
  created_at timestamptz default now()
);

alter table organizations enable row level security;

-- Backfill: todo lo que ya existe pertenece a "Energía Secing".
insert into organizations (name, slug, plan) values ('Energía Secing', 'energia-secing', 'activo');

-- ----------------------------------------------------------
-- 2) Agregar organization_id a cada tabla de datos, y llenarlo
--    con la organización recién creada para no romper nada.
-- ----------------------------------------------------------
do $$
declare
  v_org_id uuid;
begin
  select id into v_org_id from organizations where slug = 'energia-secing';

  alter table profiles add column if not exists organization_id uuid references organizations(id);
  update profiles set organization_id = v_org_id where organization_id is null;

  alter table vehicles add column if not exists organization_id uuid references organizations(id);
  update vehicles set organization_id = v_org_id where organization_id is null;

  alter table reservations add column if not exists organization_id uuid references organizations(id);
  update reservations set organization_id = v_org_id where organization_id is null;

  alter table bitacoras add column if not exists organization_id uuid references organizations(id);
  update bitacoras set organization_id = v_org_id where organization_id is null;

  alter table bitacora_danios add column if not exists organization_id uuid references organizations(id);
  update bitacora_danios set organization_id = v_org_id where organization_id is null;

  alter table fuel_vouchers add column if not exists organization_id uuid references organizations(id);
  update fuel_vouchers set organization_id = v_org_id where organization_id is null;

  alter table auditoria_logs add column if not exists organization_id uuid references organizations(id);
  update auditoria_logs set organization_id = v_org_id where organization_id is null;

  alter table maintenance add column if not exists organization_id uuid references organizations(id);
  update maintenance set organization_id = v_org_id where organization_id is null;

  alter table inspections add column if not exists organization_id uuid references organizations(id);
  update inspections set organization_id = v_org_id where organization_id is null;
end $$;

-- profiles.organization_id es obligatorio de aquí en adelante (todo
-- usuario pertenece a una empresa). Las demás se dejan nullable a
-- propósito por ahora, el trigger de la sección 4 las llena solas.
alter table profiles alter column organization_id set not null;

-- ----------------------------------------------------------
-- 3) branding_settings y gps_integration_settings dejan de ser una
--    fila única global — pasan a ser UNA fila POR organización.
-- ----------------------------------------------------------
do $$
declare
  v_org_id uuid;
begin
  select id into v_org_id from organizations where slug = 'energia-secing';

  alter table branding_settings drop constraint if exists single_row;
  alter table branding_settings add column if not exists organization_id uuid references organizations(id);
  update branding_settings set organization_id = v_org_id where organization_id is null;
  alter table branding_settings alter column organization_id set not null;
  alter table branding_settings drop constraint if exists branding_settings_pkey;
  alter table branding_settings drop column if exists id;
  alter table branding_settings add primary key (organization_id);

  alter table gps_integration_settings add column if not exists organization_id uuid references organizations(id);
  update gps_integration_settings set organization_id = v_org_id where organization_id is null;
  alter table gps_integration_settings alter column organization_id set not null;
  alter table gps_integration_settings drop constraint if exists single_row;
  alter table gps_integration_settings drop constraint if exists gps_integration_settings_pkey;
  alter table gps_integration_settings drop column if exists id;
  alter table gps_integration_settings add primary key (organization_id);
end $$;

-- ----------------------------------------------------------
-- 4) Funciones de apoyo + triggers para que el frontend NO tenga
--    que enviar organization_id manualmente en cada insert: se
--    completa solo, según la organización del usuario autenticado.
-- ----------------------------------------------------------
create or replace function auth_org_id() returns uuid as $$
  select organization_id from profiles where id = auth.uid();
$$ language sql security definer stable set search_path = public;

create or replace function set_organization_id() returns trigger as $$
begin
  if new.organization_id is null then
    new.organization_id := auth_org_id();
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_org_vehicles on vehicles;
create trigger trg_org_vehicles before insert on vehicles for each row execute function set_organization_id();

drop trigger if exists trg_org_reservations on reservations;
create trigger trg_org_reservations before insert on reservations for each row execute function set_organization_id();

drop trigger if exists trg_org_bitacoras on bitacoras;
create trigger trg_org_bitacoras before insert on bitacoras for each row execute function set_organization_id();

drop trigger if exists trg_org_bitacora_danios on bitacora_danios;
create trigger trg_org_bitacora_danios before insert on bitacora_danios for each row execute function set_organization_id();

drop trigger if exists trg_org_fuel_vouchers on fuel_vouchers;
create trigger trg_org_fuel_vouchers before insert on fuel_vouchers for each row execute function set_organization_id();

drop trigger if exists trg_org_auditoria_logs on auditoria_logs;
create trigger trg_org_auditoria_logs before insert on auditoria_logs for each row execute function set_organization_id();

drop trigger if exists trg_org_maintenance on maintenance;
create trigger trg_org_maintenance before insert on maintenance for each row execute function set_organization_id();

drop trigger if exists trg_org_inspections on inspections;
create trigger trg_org_inspections before insert on inspections for each row execute function set_organization_id();

-- Índices — cada consulta multi-tenant filtra por organization_id
-- prácticamente siempre, vale la pena indexarlo en cada tabla.
create index if not exists idx_vehicles_org on vehicles (organization_id);
create index if not exists idx_reservations_org on reservations (organization_id);
create index if not exists idx_bitacoras_org on bitacoras (organization_id);
create index if not exists idx_maintenance_org on maintenance (organization_id);
create index if not exists idx_inspections_org on inspections (organization_id);
create index if not exists idx_fuel_vouchers_org on fuel_vouchers (organization_id);
create index if not exists idx_auditoria_logs_org on auditoria_logs (organization_id);
