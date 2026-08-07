-- ==========================================================
-- activar_usuario_manual.sql — SOLO PARA USO DE EMERGENCIA
--
-- Activa a un colaborador SIN enviarle ningún correo. Tú le dices
-- directamente (WhatsApp, en persona, etc.) su correo y la
-- contraseña temporal que le asignaste aquí. Puede iniciar sesión de
-- inmediato con esos datos.
--
-- CÓMO USARLO: copia este bloque completo, reemplaza el correo y la
-- contraseña temporal, y corre en el SQL Editor. Repite una vez por
-- persona (cambia los dos valores marcados abajo).
-- ==========================================================

-- 1) Establece la contraseña directamente (requiere pgcrypto, ya
--    instalado en tu proyecto desde las migraciones anteriores).
update auth.users
set
  encrypted_password = crypt('CAMBIA-ESTA-CONTRASEÑA-TEMPORAL', gen_salt('bf')),
  email_confirmed_at = coalesce(email_confirmed_at, now())
where email = 'correo-de-la-persona@energiasecing.com';

-- 2) Marca su perfil como activo (si no haces esto, la app lo manda
--    de vuelta a "crear contraseña" aunque ya le hayas puesto una).
update profiles
set status = 'activo'
where email = 'correo-de-la-persona@energiasecing.com';
