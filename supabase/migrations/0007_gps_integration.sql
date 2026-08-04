-- ==========================================================
-- 0007_gps_integration.sql
--
-- Guarda la configuración de acceso al portal de GPS externo
-- (ej. 4Track) para poder enlazarlo/embeberlo desde DrivePulse.
--
-- ADVERTENCIA DE SEGURIDAD:
-- Esta tabla guarda usuario/contraseña de un servicio de terceros en
-- texto plano dentro de Postgres. Está protegida por RLS (solo el
-- administrador puede leerla o escribirla), pero eso es una
-- protección más débil que un vault de secretos real. Si más
-- adelante quieres subir el nivel de seguridad, la opción correcta
-- es cifrar estos valores con la extensión pgsodium/Supabase Vault,
-- o mover las credenciales a un secreto de Edge Function en vez de
-- una tabla consultable. Por ahora, esto es funcional y razonable
-- para un panel interno de un solo administrador de confianza.
-- ==========================================================

create table gps_integration_settings (
  id int primary key default 1,
  enabled boolean not null default false,
  portal_url text default 'https://gps.4track.mx/',
  username text,
  password text,
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);

insert into gps_integration_settings (id) values (1);

alter table gps_integration_settings enable row level security;

create policy "solo admin lee configuracion gps"
  on gps_integration_settings for select
  using (auth_role() = 'administrador');

create policy "solo admin edita configuracion gps"
  on gps_integration_settings for update
  using (auth_role() = 'administrador');
