# Plan de Migración — DrivePulse
### De prototipo (artifact) a producción con GitHub + Supabase + Vercel

Este documento es la guía para llevar el prototipo funcional de DrivePulse a una aplicación real, con base de datos, autenticación y almacenamiento persistentes. Está pensado para que lo sigas tú mismo o se lo entregues completo a **Claude Code** para que lo ejecute directamente sobre tu repositorio.

---

## 0. Resumen de la arquitectura objetivo

```
GitHub (repo)  →  Vercel (build + hosting + CI/CD)
                          │
                          ▼
                  React (Vite) + Tailwind
                          │
                          ▼
                    Supabase
        ┌─────────────┬─────────────┬─────────────┐
        │  Postgres   │    Auth     │   Storage    │
        │  (RLS)      │  (invites)  │  (buckets)   │
        └─────────────┴─────────────┴─────────────┘
```

- **GitHub**: control de versiones y disparador de despliegues.
- **Vercel**: build automático en cada push, preview por Pull Request, dominio de producción.
- **Supabase**: reemplaza todo el estado en memoria del prototipo — base de datos Postgres, autenticación real (con flujo de invitación por correo), y storage para fotos, firmas y logotipos. También da Row Level Security (RLS), que es la forma correcta de aplicar tu regla de "administrador vs. trabajador" a nivel de base de datos (no solo en el cliente).

---

## 1. Estructura del repositorio

```
drivepulse/
├── .env.local                  # variables de entorno (no se sube a git)
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── supabase/
│   ├── migrations/             # SQL versionado (schema + RLS)
│   │   └── 0001_init.sql
│   ├── seed.sql                # datos de prueba (opcional)
│   └── functions/              # Edge Functions (invitaciones, OCR, etc.)
│       ├── invite-user/
│       └── ocr-voucher/
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── lib/
    │   └── supabaseClient.js
    ├── routes/                 # con react-router-dom
    │   ├── Login.jsx
    │   ├── SetPassword.jsx
    │   ├── Dashboard.jsx
    │   ├── Reservas.jsx
    │   ├── Bitacora.jsx
    │   ├── Vehiculo.jsx
    │   ├── Mantenimientos.jsx
    │   ├── Inspecciones.jsx
    │   └── Configuracion.jsx
    ├── components/
    │   ├── layout/ (Sidebar, FleetPanel, VehicleBanner)
    │   ├── calendar/ (Gantt, DragDrop)
    │   ├── bitacora/ (DamageMap, SignaturePad, VoucherOCR)
    │   └── ui/ (Badge, Modal, Toast, Field)
    ├── hooks/
    │   ├── useAuth.js
    │   ├── useRole.js
    │   └── useRealtimeReservations.js
    └── guards/
        └── RequireRole.jsx
```

**Diferencia clave vs. el artifact:** el artifact usa un único archivo con `useState` y navegación simulada por variable de vista. En el repo real usas **react-router-dom** para rutas de verdad (`/set-password`, `/vehiculo/:id`, etc.) y separas cada vista en su archivo.

---

## 2. Esquema de base de datos (Supabase / Postgres)

Archivo `supabase/migrations/0001_init.sql`. Copia y ejecuta esto en el SQL Editor de Supabase o vía `supabase db push`.

```sql
-- ==========================================================
-- EXTENSIONES
-- ==========================================================
create extension if not exists "uuid-ossp";

-- ==========================================================
-- PERFILES (extiende auth.users, nunca se guarda password aquí)
-- ==========================================================
create type user_role as enum ('administrador', 'trabajador');
create type user_status as enum ('invitado', 'activo', 'inactivo');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role user_role not null default 'trabajador',
  area text,
  status user_status not null default 'invitado',
  created_at timestamptz default now()
);

-- ==========================================================
-- VEHÍCULOS
-- ==========================================================
create type vehicle_status as enum ('disponible', 'en_uso', 'reservado', 'mantenimiento');
create type fuel_level as enum ('Vacío', '1/4', '1/2', '3/4', 'Lleno');

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
  firma_url text,                     -- imagen subida a Storage
  gps_lat double precision,
  gps_lng double precision,
  created_at timestamptz default now()
);

create table bitacora_danios (
  id uuid primary key default uuid_generate_v4(),
  bitacora_id uuid references bitacoras(id) on delete cascade,
  zona text not null,                 -- frontal, trasera, lat_izq, lat_der, otras
  nota text,
  foto_url text
);

create table fuel_vouchers (
  id uuid primary key default uuid_generate_v4(),
  bitacora_id uuid references bitacoras(id) on delete cascade,
  vehicle_id uuid references vehicles(id),
  imagen_url text not null,
  litros numeric,
  monto numeric,
  estacion text,
  fecha_ticket timestamptz,
  proyecto text,
  created_at timestamptz default now()
);

-- ==========================================================
-- CAJA NEGRA — snapshot inmutable (JSONB), nunca editable
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
```

### Índices recomendados
```sql
create index on reservations (vehicle_id, start_date, end_date);
create index on bitacoras (vehicle_id, created_at);
create index on maintenance (vehicle_id);
```

---

## 3. Row Level Security (RLS) — aquí vive tu regla de roles real

Con RLS, aunque alguien manipule el cliente o llame a la API directo, la base de datos rechaza lo que no le corresponde a su rol. Esto es lo que reemplaza (y refuerza) las restricciones de ruta que hoy están solo en el cliente.

```sql
-- Habilitar RLS en todas las tablas sensibles
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
create policy "todos los autenticados leen vehículos"
  on vehicles for select using (auth.uid() is not null);

create policy "solo admin modifica vehículos"
  on vehicles for insert with check (auth_role() = 'administrador');
create policy "solo admin actualiza vehículos"
  on vehicles for update using (auth_role() = 'administrador');
create policy "solo admin elimina vehículos"
  on vehicles for delete using (auth_role() = 'administrador');

-- ---------- RESERVATIONS ----------
create policy "todos leen reservas" on reservations for select using (auth.uid() is not null);
create policy "trabajador crea su propia reserva, admin crea cualquiera"
  on reservations for insert
  with check (auth_role() = 'administrador' or user_id = auth.uid());
create policy "solo admin reprograma (drag&drop) o edita cualquier reserva"
  on reservations for update using (auth_role() = 'administrador');
create policy "solo admin elimina reservas"
  on reservations for delete using (auth_role() = 'administrador');

-- ---------- BITACORAS ----------
create policy "admin ve todas, trabajador ve las suyas"
  on bitacoras for select
  using (auth_role() = 'administrador' or user_id = auth.uid());
create policy "trabajador y admin crean bitácoras"
  on bitacoras for insert with check (auth.uid() is not null);
-- Importante: SIN policy de UPDATE ni DELETE -> las bitácoras y su
-- auditoría quedan inmutables por diseño (ver sección 4).

-- ---------- AUDITORIA_LOGS (Caja Negra) ----------
create policy "solo admin lee auditoría"
  on auditoria_logs for select using (auth_role() = 'administrador');
create policy "cualquier usuario autenticado puede insertar su propio snapshot"
  on auditoria_logs for insert with check (auth.uid() is not null);
-- SIN policies de update/delete: inmutable para todos, incluido el admin.

-- ---------- MAINTENANCE / INSPECTIONS / BRANDING ----------
create policy "admin CRUD completo mantenimientos"
  on maintenance for all using (auth_role() = 'administrador') with check (auth_role() = 'administrador');
create policy "admin CRUD completo inspecciones"
  on inspections for all using (auth_role() = 'administrador') with check (auth_role() = 'administrador');
create policy "todos leen branding, solo admin edita"
  on branding_settings for select using (true);
create policy "solo admin edita branding"
  on branding_settings for update using (auth_role() = 'administrador');
```

> **Nota sobre inmutabilidad:** en Postgres, si una tabla no tiene policy de `UPDATE`/`DELETE` para ningún rol, esas operaciones quedan bloqueadas por defecto con RLS activo — ni siquiera el `service_role` de tu backend debería usarse para tocarlas salvo en un proceso de auditoría interna documentado.

---

## 4. Autenticación real y flujo de invitación

El prototipo simula el login. En producción usas **Supabase Auth**:

1. **Invitar colaborador (solo admin):**
   - Desde `/configuracion` → Gestión de Usuarios, tu backend llama a `supabase.auth.admin.inviteUserByEmail(email)` (esto requiere una **Edge Function** o un backend con la `service_role key`, nunca desde el cliente).
   - Supabase envía el correo con el enlace mágico.
   - Al crear el usuario en `auth.users`, un **trigger** inserta la fila correspondiente en `profiles` con `status = 'invitado'`.

   ```sql
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
   ```

2. **Ruta `/set-password`:**
   - El enlace del correo redirige aquí con un `access_token` en la URL.
   - Al montar, Supabase JS detecta la sesión de recuperación (`onAuthStateChange` con evento `PASSWORD_RECOVERY`) — de ahí tu loader inicial: esperas ese evento antes de decidir si muestras el formulario o rediriges a `/login`.
   - Al enviar, llamas `supabase.auth.updateUser({ password })` y actualizas `profiles.status = 'activo'`.

3. **Login normal:** `supabase.auth.signInWithPassword({ email, password })`.

4. **Restricción de rutas por rol:** en el cliente, un guard (`RequireRole.jsx`) lee `profiles.role` desde el contexto de sesión y redirige; en el servidor, las RLS de la sección 3 son la barrera real.

---

## 5. Storage (buckets)

Crea estos buckets en Supabase Storage:

| Bucket | Contenido | Acceso |
|---|---|---|
| `vehicle-photos` | Fotos de los vehículos | público de lectura, admin escribe |
| `evidence-photos` | Fotos de desperfectos por zona | privado, solo el creador y admin |
| `signatures` | Firmas digitales (PNG del canvas) | privado, solo admin lee |
| `fuel-vouchers` | Fotos de tickets de gasolina | privado, admin lee (auditoría fiscal) |
| `branding` | Logo y banner de login | público de lectura, admin escribe |

Política de ejemplo para `evidence-photos`:
```sql
create policy "admin lee toda evidencia"
  on storage.objects for select
  using (bucket_id = 'evidence-photos' and auth_role() = 'administrador');
create policy "usuario sube su propia evidencia"
  on storage.objects for insert
  with check (bucket_id = 'evidence-photos' and auth.uid() is not null);
```

---

## 6. Piezas que hoy están "simuladas" y su reemplazo real

| Función en el artifact | Reemplazo en producción |
|---|---|
| OCR del voucher (valores aleatorios) | Edge Function que llama a un servicio real de OCR (Google Vision API, AWS Textract, o Mindee) y devuelve litros/monto/estación/fecha |
| QR "falso" (patrón decorativo) | Librería real como `qrcode` (npm) generando `https://tudominio.com/vehiculo/{id}` como valor codificado |
| GPS con fallback fijo | Igual (`navigator.geolocation`), pero ahora el resultado se guarda en `bitacoras.gps_lat/gps_lng` real |
| Cola "offline" en memoria | Se vuelve real con Service Worker + IndexedDB (PWA) que reintenta el `insert` a Supabase al recuperar conexión |
| Excel export | Igual (`xlsx`/SheetJS), pero ahora exporta datos reales traídos con `supabase.from(...).select()` |

---

## 7. Vercel — despliegue

1. Conecta el repo de GitHub a un nuevo proyecto en Vercel (detecta Vite automáticamente).
2. Variables de entorno en Vercel (Project Settings → Environment Variables):
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=xxxxx
   ```
   La `service_role key` **nunca** va en variables `VITE_*` (esas se exponen al cliente) — solo se usa dentro de Edge Functions de Supabase.
3. Cada push a `main` → despliegue a producción. Cada Pull Request → preview URL automática, útil para que RH revise cambios antes de aprobarlos.
4. Dominio personalizado (ej. `flotilla.energiasecing.mx`) se agrega en Vercel → Domains.

---

## 8. Orden de ejecución sugerido

1. **Repo base**: `npm create vite@latest drivepulse -- --template react`, instalar Tailwind, lucide-react, xlsx, react-router-dom, `@supabase/supabase-js`.
2. **Proyecto Supabase**: crear proyecto, correr la migración de la sección 2, aplicar RLS de la sección 3.
3. **Auth**: configurar plantilla de correo de invitación en Supabase (Authentication → Email Templates), implementar `/set-password` y el guard de roles.
4. **Migrar vistas** del artifact una por una a `src/routes/`, reemplazando `useState` mock por queries de Supabase (`supabase.from('vehicles').select()`, etc.).
5. **Storage**: conectar subida real de fotos, firmas y vouchers.
6. **Realtime** (opcional pero recomendado): usar `supabase.channel()` sobre `reservations` para que el calendario se actualice en vivo entre usuarios sin recargar.
7. **Deploy** a Vercel con datos reales de prueba (usa `supabase/seed.sql`).
8. **QA de RLS**: probar activamente con un usuario `trabajador` intentando leer/editar lo que no le corresponde (vía Postman o la consola) para confirmar que la base de datos lo bloquea, no solo el frontend.

---

## 9. Qué llevarle a Claude Code

Si vas a delegar la ejecución, puedes pasarle este documento completo más el archivo `DrivePulse.jsx` del prototipo y pedirle:

> "Usa este plan de migración y este prototipo de referencia para inicializar el repo, crear las migraciones de Supabase, configurar RLS y dejar el proyecto listo para desplegar en Vercel."

Claude Code puede crear los archivos, correr `git init`, ejecutar las migraciones contra tu proyecto de Supabase (con tus credenciales) y dejarte el repo conectado a Vercel de punta a punta.
