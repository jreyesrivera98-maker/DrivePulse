# Edge Function: `invite-user`

Invita colaboradores por correo a DrivePulse. Es el backend que le falta
al botón **"Invitar colaborador"** de `/configuracion`.

## Por qué existe como Edge Function y no como llamada directa

Invitar usuarios (`auth.admin.inviteUserByEmail`) requiere la
**service_role key**, que tiene permisos totales sobre tu proyecto de
Supabase. Esa llave **nunca** debe usarse en el frontend (con prefijo
`VITE_` quedaría visible en el navegador de cualquiera). Por eso esta
función corre en el servidor de Supabase: recibe la petición del
frontend con el token del admin, valida que en verdad sea admin, y solo
entonces usa la service_role key internamente para crear la invitación.

## Requisitos previos

- Haber ejecutado `supabase/migrations/0001_init.sql` (esta función depende
  del trigger `on_auth_user_created` y de la tabla `profiles`).
- Tener la Supabase CLI instalada y el proyecto vinculado:
  ```bash
  npm install -g supabase
  supabase login
  supabase link --project-ref TU-PROJECT-REF
  ```

## Configurar el secreto `SITE_URL`

`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` ya
están disponibles automáticamente dentro de cualquier Edge Function de
Supabase — no hay que configurarlos a mano.

Lo único que sí debes definir es a dónde debe redirigir el correo de
invitación una vez que la persona hace clic (tu app desplegada):

```bash
# Mientras pruebas en local:
supabase secrets set SITE_URL=http://localhost:5173

# Cuando ya tengas la URL real de Vercel, actualízalo:
supabase secrets set SITE_URL=https://drivepulse-xxxx.vercel.app
```

## Desplegar la función

```bash
supabase functions deploy invite-user
```

## Probar la función directamente (opcional, con curl)

Necesitas el token de sesión de un usuario con `role = administrador`
(lo puedes copiar desde `localStorage` en devtools mientras estás
logueado en la app, bajo la llave `sb-<project-ref>-auth-token`, campo
`access_token`), y tu `anon key`.

```bash
curl -X POST \
  "https://TU-PROYECTO.supabase.co/functions/v1/invite-user" \
  -H "Authorization: Bearer TU_ACCESS_TOKEN_DE_ADMIN" \
  -H "apikey: TU_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
        "name": "Jorge Cantú",
        "email": "jorge.cantu@energiasecing.mx",
        "role": "trabajador",
        "area": "Mantenimiento"
      }'
```

Respuesta esperada:
```json
{ "success": true, "userId": "…", "email": "jorge.cantu@energiasecing.mx" }
```

## Uso desde el frontend

Ya está conectado en `src/lib/supabaseClient.js`:

```js
import { inviteUser } from "@/lib/supabaseClient";

await inviteUser({
  name: "Jorge Cantú",
  email: "jorge.cantu@energiasecing.mx",
  role: "trabajador",
  area: "Mantenimiento",
});
```

Esto llama automáticamente a `supabase.functions.invoke("invite-user", ...)`,
que ya adjunta el token de sesión del usuario logueado — no necesitas
pasarlo tú mismo.

## Respuestas de error que maneja

| Código | Causa |
|---|---|
| 401 | No hay sesión válida (falta token o expiró) |
| 403 | Quien llama no tiene `role = 'administrador'` |
| 400 | Faltan campos, rol inválido, correo inválido, o el correo ya existe |
| 500 | Error inesperado o falla al completar el perfil tras la invitación |
