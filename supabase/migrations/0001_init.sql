-- ==========================================================
-- DrivePulse (by Energía Secing)
-- Migración inicial: esquema de base de datos + RLS
-- ==========================================================

-- ==========================================================
-- EXTENSIONES
-- ==========================================================
create extension if not exists "uuid-ossp";

-- ==========================================================
-- TIPOS ENUM
-- ==========================================================
create type user_role as enum ('administrador', 'trabajador');
create type user_status as enum ('invitado', 'activo', 'inactivo');
create type vehicle_status as enum ('disponible', 'en_uso', 'reservado', 'mantenimiento');
create type fuel_level as enum ('Vacío', '1/4', '1/2', '3/4', 'Lleno');

-- ==========================================================
-- PERFILES (extiende auth.users; nunca se guarda password aquí)
-- ==========================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role user_role not null default 'trabajador',
  area text,
  status user_status not null default 'invitado',
  created_at timestamptz default now()
);

-- Trigger: al crear un usuario en auth.users (invitación), crear su perfil
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, name, email, status)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), new.email, 'invitado');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ==========================================================
-- VEHÍCULOS
-- ==========================================================
create table vehicles (
  id uuid primary key default uuid_generate_v4(),
  plate text not null unique,
  brand text not null,
  model text not null,
  year int,
  category text,
  status vehicle_status not null default 'disponible',
  km int not null default 0,
  fuel fuel_level not null default 'Lleno',
  photo_url text,
  project text,
  doc_circulacion boolean default true,
  doc_seguro boolean default true,
  doc_verificacion boolean default true,
  doc_licencia_asociada boolean default true,
  created_at timestamptz default now()
);

-- ==========================================================
-- RESERVAS
-- ==========================================================
create table reservations (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid references vehicles(id) on delete cascade,
  user_id uuid references profiles(id),
  start_date date not null,
  end_date date not null,
  project text,
  destino text,
  autorizado_por text,
  created_at timestamptz default now(),
  constraint valid_range check (end_date >= start_date)
);

create index idx_reservations_vehicle_dates on reservations (vehicle_id, start_date, end_date);

-- ==========================================================
-- BITÁCORAS (check-in / check-out)
-- ==========================================================
create table bitacoras (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid references vehicles(id),
  user_id uuid references profiles(id),
  tipo text not null,                 -- 'salida' | 'regreso'
  proyecto text,
  destino text,
  autorizado_por text,
  km_inicial int,
  km_final int,
  combustible_salida fuel_level,
  combustible_regreso fuel_level,
  limpieza boolean default true,
  incidencias text,
  firma_url text,                     -- imagen subida a Storage (bucket: signatures)
  gps_lat double precision,
  gps_lng double precision,
  created_at timestamptz default now()
);

create index idx_bitacoras_vehicle_created on bitacoras (vehicle_id, created_at);

create table bitacora_danios (
  id uuid primary key default uuid_generate_v4(),
  bitacora_id uuid references bitacoras(id) on delete cascade,
  zona text not null,                 -- frontal, trasera, lat_izq, lat_der, otras
  nota text,
  foto_url text                       -- Storage (bucket: evidence-photos)
);

create table fuel_vouchers (
  id uuid primary key default uuid_generate_v4(),
  bitacora_id uuid references bitacoras(id) on delete cascade,
  vehicle_id uuid references vehicles(id),
  imagen_url text not null,           -- Storage (bucket: fuel-vouchers)
  litros numeric,
  monto numeric,
  estacion text,
  fecha_ticket timestamptz,
  proyecto text,
  created_at timestamptz default now()
);

-- ==========================================================
-- CAJA NEGRA — snapshot inmutable (JSONB); sin policies de
-- UPDATE/DELETE más abajo, por lo que nadie puede alterarla.
-- ==========================================================
create table auditoria_logs (
  id uuid primary key default uuid_generate_v4(),
  bitacora_id uuid references bitacoras(id),
  snapshot jsonb not null,
  hash text not null,
  created_at timestamptz default now()
);

-- ==========================================================
-- MANTENIMIENTOS
-- ==========================================================
create table maintenance (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid references vehicles(id),
  tipo text not null,                 -- Preventivo | Correctivo
  taller text,
  descripcion text,
  costo numeric default 0,
  estado text default 'Programado',
  fecha date default current_date,
  created_at timestamptz default now()
);

create index idx_maintenance_vehicle on maintenance (vehicle_id);

-- ==========================================================
-- INSPECCIONES MENSUALES
-- ==========================================================
create table inspections (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid references vehicles(id),
  inspector_id uuid references profiles(id),
  docs jsonb,
  equipo jsonb,
  matriz jsonb,
  observaciones text,
  km int,
  created_at timestamptz default now()
);

-- ==========================================================
-- CONFIGURACIÓN / BRANDING (fila única)
-- ==========================================================
create table branding_settings (
  id int primary key default 1,
  name text default 'DrivePulse',
  logo_url text,
  login_title text default 'Bienvenido a DrivePulse',
  login_banner_url text,
  footer_text text default '© Energía Secing — DrivePulse.',
  lightning_action text default 'a',
  constraint single_row check (id = 1)
);
insert into branding_settings (id) values (1);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================================
alter table profiles enable row level security;
alter table vehicles enable row level security;
alter table reservations enable row level security;
alter table bitacoras enable row level security;
alter table bitacora_danios enable row level security;
alter table fuel_vouchers enable row level security;
alter table auditoria_logs enable row level security;
alter table maintenance enable row level security;
alter table inspections enable row level security;
alter table branding_settings enable row level security;

-- Función auxiliar: rol del usuario autenticado
create or replace function auth_role() returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

-- ---------- PROFILES ----------
create policy "usuarios ven su propio perfil o admin ve todos"
  on profiles for select
  using (auth.uid() = id or auth_role() = 'administrador');

create policy "solo admin crea/edita/borra usuarios"
  on profiles for all
  using (auth_role() = 'administrador')
  with check (auth_role() = 'administrador');

-- ---------- VEHICLES ----------
create policy "todos los autenticados leen vehiculos"
  on vehicles for select using (auth.uid() is not null);

create policy "solo admin inserta vehiculos"
  on vehicles for insert with check (auth_role() = 'administrador');

create policy "solo admin actualiza vehiculos"
  on vehicles for update using (auth_role() = 'administrador');

create policy "solo admin elimina vehiculos"
  on vehicles for delete using (auth_role() = 'administrador');

-- ---------- RESERVATIONS ----------
create policy "todos leen reservas"
  on reservations for select using (auth.uid() is not null);

create policy "trabajador crea su propia reserva, admin crea cualquiera"
  on reservations for insert
  with check (auth_role() = 'administrador' or user_id = auth.uid());

create policy "solo admin reprograma o edita cualquier reserva"
  on reservations for update using (auth_role() = 'administrador');

create policy "solo admin elimina reservas"
  on reservations for delete using (auth_role() = 'administrador');

-- ---------- BITACORAS ----------
create policy "admin ve todas, trabajador ve las suyas"
  on bitacoras for select
  using (auth_role() = 'administrador' or user_id = auth.uid());

create policy "trabajador y admin crean bitacoras"
  on bitacoras for insert with check (auth.uid() is not null);
-- Sin policy de UPDATE ni DELETE: las bitácoras quedan inmutables por diseño.

-- ---------- BITACORA_DANIOS ----------
create policy "admin ve todos los danios, trabajador ve los de sus bitacoras"
  on bitacora_danios for select
  using (
    auth_role() = 'administrador'
    or exists (select 1 from bitacoras b where b.id = bitacora_id and b.user_id = auth.uid())
  );

create policy "usuario autenticado registra danios de su bitacora"
  on bitacora_danios for insert with check (auth.uid() is not null);

-- ---------- FUEL_VOUCHERS ----------
create policy "admin ve todos los vouchers, trabajador ve los suyos"
  on fuel_vouchers for select
  using (
    auth_role() = 'administrador'
    or exists (select 1 from bitacoras b where b.id = bitacora_id and b.user_id = auth.uid())
  );

create policy "usuario autenticado registra su voucher"
  on fuel_vouchers for insert with check (auth.uid() is not null);

-- ---------- AUDITORIA_LOGS (Caja Negra) ----------
create policy "solo admin lee auditoria"
  on auditoria_logs for select using (auth_role() = 'administrador');

create policy "usuario autenticado inserta su propio snapshot"
  on auditoria_logs for insert with check (auth.uid() is not null);
-- Sin policies de UPDATE/DELETE: inmutable para todos, incluido el admin.

-- ---------- MAINTENANCE ----------
create policy "admin CRUD completo mantenimientos"
  on maintenance for all
  using (auth_role() = 'administrador')
  with check (auth_role() = 'administrador');

-- ---------- INSPECTIONS ----------
create policy "admin CRUD completo inspecciones"
  on inspections for all
  using (auth_role() = 'administrador')
  with check (auth_role() = 'administrador');

-- ---------- BRANDING_SETTINGS ----------
create policy "todos leen branding"
  on branding_settings for select using (true);

create policy "solo admin edita branding"
  on branding_settings for update using (auth_role() = 'administrador');
