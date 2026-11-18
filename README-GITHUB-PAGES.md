# Publicación en GitHub Pages y conexión con Supabase

## 1. Crear el backend de Supabase

1. Creá un proyecto en Supabase y abrí **SQL Editor**.
2. Ejecutá el archivo `supabase/schema.sql` completo.
3. En **Authentication → Users**, creá la cuenta inicial del dueño. En SQL Editor ejecutá el `INSERT` comentado al final del esquema, cambiando el email, para asignarle `owner`. Las cuentas nuevas empiezan como `user` sin acceso al panel; dueño/administrador les asignan cargo desde **Equipo y roles**. Desactivá la autoinscripción en **Authentication → Settings** para que sólo el equipo tenga cuentas.
4. Copiá **Project URL** y la clave pública **anon/publishable** desde **Project Settings → API**. No uses la `service_role` en la web ni en variables `VITE_`.

## 2. Desarrollo local

```bash
cp .env.example .env.local
# Editá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local
pnpm install
pnpm dev
```

El panel está en `/#/admin`. El inicio de sesión usa email y contraseña de Supabase; sólo `owner`, `admin`, `manager` y `secretary` acceden. La tabla `profiles` y las políticas RLS, no sólo la interfaz, aplican cada permiso.

## 3. Publicar

Subí el proyecto a GitHub, asegurate de que la rama principal se llame `main` y habilitá GitHub Pages para **GitHub Actions** en Settings → Pages. El workflow `.github/workflows/deploy.yml` compila `dist/public` y lo publica automáticamente al hacer push a `main`.

En Settings → Secrets and variables → Actions → Variables, agregá:

- Variable `VITE_SUPABASE_URL`: la URL del proyecto.
- Variable `VITE_SUPABASE_ANON_KEY`: la clave pública anon/publishable.
- Variable `VITE_TURNSTILE_SITE_KEY`: la Site Key pública de Cloudflare Turnstile.

La clave anon y la Site Key de Turnstile quedan visibles en la aplicación compilada por diseño. La seguridad de datos depende de RLS. Nunca coloques `service_role` en una variable `VITE_*` ni en un secreto de build.

## 4. Datos y operaciones

- Las propiedades en estado **Publicado**, **Vendido** o **Alquilado** aparecen en la web. **Borrador** y **Archivado** son sólo internos.
- Cada aviso acepta moneda USD o ARS; los alquileres se expresan por mes.
- La superficie cubierta se carga en m² desde el panel y es opcional; si no está confirmada, la ficha pública indica “A consultar”. Para un proyecto Supabase ya existente, volvé a ejecutar `supabase/schema.sql`: la columna se agrega con `IF NOT EXISTS`.
- Las consultas enviadas desde una ficha llegan al CRM. El equipo puede registrar otras manualmente, moverlas por etapas y crear seguimientos.
- Auditoría guarda cambios de propiedades, consultas, seguimientos y asignaciones de cargo mediante triggers de la base. Es de sólo lectura y queda reservada a `owner`/`admin`.
- Las imágenes cargadas desde el panel se almacenan en `property-images`. Las URL remotas también se pueden agregar como una por línea.

## 6. Protección del formulario, imágenes y despliegue

Antes de actualizar un portal existente, hacé una copia de seguridad y coordiná el cambio: el SQL vuelve privado el bucket `property-images`, así que las imágenes del sitio anterior pueden dejar de cargar hasta publicar el nuevo frontend. Aplicá `supabase/schema.sql`, configurá Turnstile, desplegá las Edge Functions y luego publicá el frontend, en ese orden.

Las consultas públicas pasan por `submit-lead`, que valida campos, desafío Turnstile, propiedad activa y rate limit en servidor. Las imágenes almacenadas se entregan como enlaces firmados temporales sólo para propiedades activas; las fotos de borradores quedan privadas. Configurá los secretos `TURNSTILE_SECRET_KEY`, `IP_HASH_SECRET` y `ALLOWED_ORIGINS` en Supabase; no compartas ni publiques claves secretas. La service-role se usa sólo dentro del entorno seguro de Edge Functions.

Seguí [la guía operativa de seguridad y publicación](SECURITY-DEPLOYMENT.md) para los comandos de Supabase, el formato de orígenes permitidos, el checklist de prueba y las referencias de GitHub Actions. El workflow compila, audita dependencias, ejecuta `pnpm check` y `pnpm test`, y publica sólo si todo termina correctamente.

### Cargos y alcance

| Cargo | Acciones permitidas |
|---|---|
| Dueño (`owner`) | Control total, auditoría y asignación de todos los cargos. No puede cambiar su propio rol y la base protege que siempre quede al menos un dueño. |
| Administrador (`admin`) | CRUD operativo de propiedades/CRM/seguimientos, auditoría y asignación de gestor/secretaría/sin acceso. No puede crear ni modificar dueños/administradores. |
| Gestor (`manager`) | Crear/editar propiedades y fotos, gestionar consultas y seguimientos. No puede borrar registros, gestionar equipo ni ver auditoría. |
| Secretaria/o (`secretary`) | Consultar inventario; crear/actualizar consultas y seguimientos. Sin edición de propiedades, borrados, equipo ni auditoría. |

Los usuarios se crean primero en **Supabase Auth → Users** y luego se les asigna el cargo en **Equipo y roles**. El perfil `user` representa una cuenta sin acceso al panel.

## 5. Comprobación del build estático

```bash
pnpm build:static
```

El resultado estático queda en `dist/public`. Se usa navegación hash (`/#/admin`, `/#/propiedad/slug`) y base de recursos relativa para que GitHub Pages funcione tanto en un dominio propio como en la URL de un repositorio.

El build incluye `client/public/404.html`, que GitHub Pages sirve para rutas limpias inexistentes con su estado HTTP 404. Las rutas de la aplicación deben abrirse con hash (`/#/`, `/#/publicar`, `/#/admin`, `/#/propiedad/slug`); las rutas hash desconocidas muestran la página React de no encontrado y no hacen una redirección a un path limpio.
