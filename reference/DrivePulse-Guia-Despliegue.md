# Guía paso a paso — Subir DrivePulse a GitHub, Supabase y Vercel

Sí, ya puedes subir esto. Aquí está el proceso completo, en orden, desde organizar los archivos hasta ver la app en línea.

---

## Paso 0 — Organiza los archivos descargados en una carpeta local

Todo lo que te he dado hasta ahora debe quedar así en tu computadora (respetando mayúsculas/minúsculas y rutas):

```
drivepulse/
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── vite.config.js
├── supabase/
│   └── migrations/
│       └── 0001_init.sql
└── src/
    ├── App.jsx
    ├── main.jsx
    ├── index.css
    └── lib/
        └── supabaseClient.js
```

El archivo grande `DrivePulse.jsx` (el prototipo) guárdalo aparte, por ejemplo en `drivepulse/reference/DrivePulse.jsx` — no es parte del build, es tu referencia para ir migrando vistas.

Verifica que tienes instalado:
- **Node.js 18+** → `node -v`
- **Git** → `git -v`

Si no los tienes: Node desde [nodejs.org](https://nodejs.org) (versión LTS), Git desde [git-scm.com](https://git-scm.com).

---

## Paso 1 — Probar que corre localmente (antes de subir nada)

Desde la carpeta `drivepulse/`:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Vas a ver un error o pantalla en blanco porque `.env.local` todavía tiene valores de ejemplo (`TU-PROYECTO.supabase.co`) — es normal, lo resolvemos en el Paso 3. Lo importante aquí es confirmar que `npm install` y `npm run dev` no truenan. Detén el servidor con `Ctrl+C`.

---

## Paso 2 — Subir el repositorio a GitHub

1. Entra a [github.com](https://github.com) → **New repository**.
   - Nombre sugerido: `drivepulse`
   - Visibilidad: **Privado** (esto maneja datos operativos de la flotilla — no lo publiques como público)
   - **No** marques "Add a README" ni "Add .gitignore" (ya tienes uno)
2. En tu terminal, dentro de `drivepulse/`:

```bash
git init
git add .
git commit -m "Scaffold inicial de DrivePulse (Vite + Supabase)"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/drivepulse.git
git push -u origin main
```

3. Verifica en GitHub que **`.env.local` NO aparece** en el repo (el `.gitignore` ya lo excluye). Si por error lo ves ahí, bórralo del historial antes de continuar — nunca subas llaves de Supabase a un repo, ni siquiera privado.

---

## Paso 3 — Crear el proyecto en Supabase

1. Entra a [supabase.com/dashboard](https://supabase.com/dashboard) → **New Project**.
   - Nombre: `drivepulse` (o `drivepulse-prod`)
   - Contraseña de base de datos: genera una fuerte y **guárdala** (la necesitas para la CLI, no para la app)
   - Región: elige la más cercana a Monterrey/N.L. (normalmente `us-east-1` o similar; Supabase no tiene región en México todavía)
   - Espera 1–2 minutos a que aprovisione.

### 3.1 — Ejecutar la migración (crear las tablas y RLS)

**Opción A — Panel visual (más simple, recomendada para empezar):**
1. En el dashboard del proyecto → **SQL Editor** → **New query**.
2. Abre tu archivo `supabase/migrations/0001_init.sql`, copia **todo** el contenido, pégalo en el editor.
3. Click **Run**. Debe terminar sin errores rojos.
4. Ve a **Table Editor** y confirma que aparecen las tablas: `profiles`, `vehicles`, `reservations`, `bitacoras`, `bitacora_danios`, `fuel_vouchers`, `auditoria_logs`, `maintenance`, `inspections`, `branding_settings`.

**Opción B — CLI (mejor a futuro, para versionar migraciones):**
```bash
npm install -g supabase
supabase login
supabase link --project-ref TU-PROJECT-REF   # lo ves en Project Settings → General
supabase db push
```

### 3.2 — Crear los buckets de Storage

Dashboard → **Storage** → **New bucket**. Crea estos 5, uno por uno:

| Nombre exacto del bucket | Público |
|---|---|
| `vehicle-photos` | Sí |
| `evidence-photos` | No |
| `signatures` | No |
| `fuel-vouchers` | No |
| `branding` | Sí |

(Las políticas de acceso finas para `evidence-photos` ya están descritas en el plan de migración que te compartí antes — se agregan después, cuando conectes la subida real de archivos.)

### 3.3 — Configurar el correo de invitación (para `/set-password`)

1. Dashboard → **Authentication** → **URL Configuration**.
   - **Site URL**: por ahora pon `http://localhost:5173` (lo cambiamos al dominio real de Vercel en el Paso 5).
   - **Redirect URLs**: agrega `http://localhost:5173/set-password` y, más adelante, `https://tu-dominio.vercel.app/set-password`.
2. Dashboard → **Authentication** → **Email Templates** → **Invite user**. Puedes dejar la plantilla por default por ahora; el enlace ya apunta a tu Redirect URL de arriba.

### 3.4 — Obtener tus llaves de API

Dashboard → **Project Settings** → **API**. Copia:
- **Project URL** (`https://xxxxx.supabase.co`)
- **anon public key**

Estas dos son las que va tu app en el cliente. La **service_role key** anótala aparte en un lugar seguro — la usarás solo cuando armemos la Edge Function de invitaciones, nunca en el frontend.

### 3.5 — Actualizar tu `.env.local` y probar de nuevo

```bash
# en drivepulse/.env.local
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi....
```

```bash
npm run dev
```

Ahora sí debería cargar sin el error de "faltan variables de entorno". Verás las rutas placeholder (`/reservas`, `/login`, etc.) — es esperado, todavía no migramos las vistas del prototipo.

### 3.6 — Crear tu primer usuario administrador

Como el autorregistro está deshabilitado, el primer usuario se crea manualmente:

1. Dashboard → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Correo: el tuyo. Contraseña: defínela tú mismo aquí (así te saltas el flujo de invitación solo para este primer usuario).
3. Ve a **Table Editor → profiles**, busca la fila que se creó automáticamente (por el trigger) con tu `id`, y cambia manualmente:
   - `role` → `administrador`
   - `status` → `activo`

A partir de aquí, ya puedes invitar a los demás colaboradores desde la app (cuando esa pantalla esté migrada) usando este usuario admin.

---

## Paso 4 — Subir el `.env.local` como secretos (no como archivo)

**Nunca subas `.env.local` a GitHub.** En vez de eso, esas dos variables se configuran directo en Vercel en el siguiente paso.

---

## Paso 5 — Desplegar en Vercel

1. Entra a [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → selecciona `drivepulse` (autoriza a Vercel a acceder a tu cuenta de GitHub si es la primera vez).
2. Vercel detecta automáticamente que es un proyecto **Vite** — no cambies el "Framework Preset" si ya dice Vite.
3. Antes de darle **Deploy**, abre **Environment Variables** y agrega:
   ```
   VITE_SUPABASE_URL       = https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY  = eyJhbGciOi....
   ```
4. Click **Deploy**. Espera 1–2 minutos.
5. Al terminar, Vercel te da una URL tipo `https://drivepulse-xxxx.vercel.app`. Ábrela — deberías ver la misma pantalla placeholder que viste en local.

### 5.1 — Conectar la URL de Vercel de vuelta a Supabase

Regresa a Supabase → **Authentication** → **URL Configuration** y actualiza:
- **Site URL**: `https://drivepulse-xxxx.vercel.app`
- **Redirect URLs**: agrega `https://drivepulse-xxxx.vercel.app/set-password`

Esto es importante — si no lo haces, los enlaces de invitación por correo seguirán apuntando a `localhost` y no funcionarán para tus colaboradores reales.

### 5.2 — Dominio personalizado (opcional, cuando quieras)

Vercel → tu proyecto → **Settings → Domains** → agrega algo como `flotilla.energiasecing.mx` (necesitas acceso al DNS de ese dominio para agregar el registro CNAME que Vercel te indica). Si lo haces, repite el paso 5.1 con ese dominio en vez del `.vercel.app`.

---

## Paso 6 — Flujo de trabajo de aquí en adelante

Cada vez que hagas cambios:

```bash
git add .
git commit -m "Descripción del cambio"
git push
```

Vercel despliega automáticamente en cada push a `main`. Si trabajas en una rama distinta o abres un Pull Request, Vercel genera una **preview URL** separada para probar antes de fusionar a producción.

---

## Checklist rápido antes de dar por hecho el Paso 3-5

- [ ] `0001_init.sql` corrió sin errores y las 10 tablas existen
- [ ] Los 5 buckets de Storage están creados
- [ ] Tienes tu Project URL y anon key guardadas
- [ ] Creaste tu usuario admin manualmente y le pusiste `role = administrador`, `status = activo`
- [ ] El repo está en GitHub y `.env.local` **no** aparece en él
- [ ] Vercel tiene las mismas dos variables de entorno configuradas
- [ ] Site URL y Redirect URLs en Supabase apuntan a la URL real de Vercel, no a localhost

---

## Lo que sigue después de esto

Con esto desplegado, la app todavía muestra pantallas "placeholder" en cada ruta — el scaffold está vivo pero las vistas reales (Login, Calendario, Bitácora, etc.) todavía viven solo en el prototipo `DrivePulse.jsx`. El siguiente trabajo es migrarlas una por una a `src/routes/`, conectadas a Supabase en vez de a datos en memoria — que es justo la tarea que le puedes delegar a Claude Code, pasándole este repo ya desplegado más el plan de migración y el prototipo como referencia.
