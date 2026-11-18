# Carga de Supabase

## Archivos

- `schema.sql`: esquema completo de tablas, índices, funciones de seguridad, roles, RLS, Storage y bitácora.

`properties.covered_surface` registra la superficie cubierta opcional en m². Se puede dejar vacía; la ficha pública mostrará “A consultar”. Para una base existente, volvé a ejecutar el esquema: la columna se agrega de forma idempotente con `IF NOT EXISTS`.

## Orden de instalación

1. Creá el proyecto en Supabase.
2. Abrí **SQL Editor** y ejecutá `schema.sql` completo.
3. Después de aplicar el esquema, creá el usuario dueño desde **Authentication → Users**.
4. En el SQL Editor ejecutá el ejemplo comentado al final de `schema.sql`, reemplazando el email por el de esa cuenta. Esto otorga el cargo `owner` inicial.
5. Desactivá la autoinscripción pública si el portal es sólo para el equipo.
6. En **Authentication → Users**, creá las demás cuentas del equipo. Nacen sin acceso (`user`). El dueño o administrador asigna después el rol desde `/#/admin` → **Equipo y roles**.

## Roles

- `owner`: control total y asignación de todos los cargos.
- `admin`: operaciones, auditoría y gestión de roles inferiores; no modifica dueño/admin.
- `manager`: crea/edita propiedades y gestiona consultas/seguimientos, sin borrados, equipo o auditoría.
- `secretary`: inventario de sólo lectura; crea/actualiza consultas y seguimientos.
- `user`: sin acceso al panel hasta ser promovido.

RLS aplica los permisos en la base, aunque se intente llamar la API sin la interfaz. Los cambios de rol sólo se hacen con la función `set_team_role`; no se permite cambiar el propio cargo y la base protege que quede al menos un dueño.

## Conexión de la web

La aplicación sólo necesita **Project URL** y la clave pública **anon/publishable**. Configuralas como `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `.env.local` para desarrollo o en GitHub Actions para publicar. No uses `service_role` en el navegador ni en variables `VITE_*`.

## Funciones Edge y secretos

Este paquete incluye `submit-lead` y `public-property-images`. Son funciones anónimas intencionales, configuradas con `verify_jwt = false`: la primera valida Turnstile, limita envíos y crea el lead desde el servidor; la segunda firma temporalmente imágenes privadas de propiedades activas. No expongas la `service_role` en el navegador.

Antes de publicar el nuevo frontend, aplicá el `schema.sql` actualizado y desplegá ambas funciones con la CLI. Configurá en los secretos de Supabase `TURNSTILE_SECRET_KEY`, `IP_HASH_SECRET` y `ALLOWED_ORIGINS`; el formato, comandos y pruebas están en [la guía de seguridad y publicación](../SECURITY-DEPLOYMENT.md). Para una instalación existente, hacé backup y coordiná el cambio porque al volver privado el bucket las imágenes públicas antiguas pueden dejar de verse hasta publicar el nuevo sitio.
