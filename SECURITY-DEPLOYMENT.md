# Seguridad y publicación del portal

Este repositorio incorpora controles de seguridad en el navegador, Supabase y GitHub Actions. No existe una protección absoluta contra intrusiones: la configuración correcta de las cuentas, las contraseñas, las políticas RLS y la revisión periódica siguen siendo necesarias.

## Orden seguro para una instalación existente

1. **Prepará una ventana de cambio y una copia de seguridad.** El SQL cambia `property-images` de público a privado y convierte en rutas internas las URL públicas antiguas que reconoce. Si el frontend viejo permanece activo después de ese cambio, sus fotos almacenadas pueden dejar de mostrarse temporalmente. Conservá una copia de la base y verificá que los objetos de Storage existen antes de continuar.
2. **Aplicá `supabase/schema.sql` completo** en Supabase → SQL Editor. El esquema elimina la inserción pública directa de leads, crea el rate limit privado, migra las referencias conocidas a las fotos y establece las políticas del bucket privado. Revisá el resultado de cada sentencia antes de seguir.
3. **Aplicá la migración `supabase/migrations/202611220002_edge_function_service_role_minimum_access.sql`.** Otorga exclusivamente al rol interno `service_role` las operaciones que necesitan las funciones de propiedades, CRM y auditoría; no concede acceso a `anon` ni a `authenticated`.
4. **Configurá los secretos del backend** según la sección siguiente.
5. **Desplegá las dos Edge Functions** y probalas antes de actualizar la página pública.
6. **Actualizá las variables de GitHub, activá Pages mediante GitHub Actions y publicá el frontend.** Hacé luego las pruebas de humo indicadas abajo.

## Secretos de Supabase

Desde la raíz del repositorio, asociá la CLI de Supabase con el proyecto activo y configurá los secretos requeridos por las Edge Functions:

```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase secrets set \
  IP_HASH_SECRET='VALOR_ALEATORIO_LARGO' \
  ALLOWED_ORIGINS='https://USUARIO.github.io,https://www.tu-dominio.com'
```

Generá `IP_HASH_SECRET` con un generador criptográfico local; por ejemplo, `openssl rand -hex 32`. En `ALLOWED_ORIGINS` anotá sólo los orígenes exactos, separados por comas, sin rutas ni barra final. Incluí cada origen realmente usado, como el dominio personalizado y el host de GitHub Pages. La función valida CORS contra esa lista y `submit-lead` aplica un campo trampa y limita cada origen de red a cinco consultas cada quince minutos.

Supabase proporciona `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` al entorno de las Edge Functions desplegadas. Si la instalación no las tiene disponibles, definilas únicamente como secretos del proyecto/funciones en Supabase. **Nunca** las pongas en `.env.local` del frontend, secretos de GitHub usados para compilar, archivos del repositorio ni variables `VITE_*`. La service-role puede omitir RLS y sólo se usa en el servidor.

Desplegá las funciones desde el directorio del proyecto que contiene `supabase/config.toml`:

```bash
supabase functions deploy submit-lead
supabase functions deploy public-property-images
```

La configuración marca `verify_jwt = false` sólo para estas dos funciones porque atienden visitantes anónimos. Eso no constituye autenticación: las funciones validan el origen y los datos; `submit-lead` usa además un campo trampa, limitación de envíos y validación de propiedad activa. Las imágenes sólo se firman para avisos activos. El navegador no recibe la service-role. `submit-lead` asigna `source`, etapa y campos de auditoría desde el servidor; la tabla `leads` no admite inserciones anónimas directas.

## Variables de GitHub Actions

En GitHub → Settings → Secrets and variables → Actions → Variables, definí:

- `VITE_SUPABASE_URL`: URL del proyecto Supabase.
- `VITE_SUPABASE_ANON_KEY`: clave anon/publishable. Es una clave pública y aparecerá en el JavaScript compilado; la seguridad depende de RLS, no de ocultar esta clave.

El workflow fija las acciones a commits SHA completos y limita `GITHUB_TOKEN` a lectura en la compilación; sólo el job de publicación recibe `pages: write` e `id-token: write`. GitHub recomienda permisos mínimos y fijar acciones externas por SHA completo cuando no se usa un lockfile de dependencias de workflows. [1] Los SHA del workflow se contrastaron con sus commits en los repositorios oficiales. [2] [3] [4] [5] [6]

El workflow ejecuta instalación congelada, auditoría, chequeo TypeScript, pruebas y build antes de desplegar. Si la auditoría encuentra una vulnerabilidad, corregí la dependencia afectada y actualizá el lockfile; no desactives el chequeo para forzar la publicación.

La política de pnpm 12 en `pnpm-workspace.yaml` permite los scripts de build sólo a `esbuild` y `@tailwindcss/oxide`, y desactiva el enlazado automático de skills ofrecidas por dependencias. Las dependencias no aprobadas no pueden ejecutar scripts; no se habilitó `dangerouslyAllowAllBuilds`. [7] [8]

La comprobación final encontró **cero vulnerabilidades conocidas en dependencias de producción**. La auditoría completa sigue reportando un advisory alto para `picomatch` (CVE-2026-112366, ReDoS) en la cadena de Vite/Vitest, sólo de desarrollo. El registro consultado señala versiones afectadas hasta 4.0.7 y todavía no lista una versión corregida. [9] El workflow obliga a pasar `pnpm audit --prod` y permite continuar con el build sólo para este advisory identificado; los demás fallos de auditoría detienen la publicación. Mantené las herramientas de desarrollo actualizadas y revisá periódicamente si se publica una corrección.

Las políticas del bucket permiten al personal autorizado leer fotos, pero cada usuario sólo puede crear, reemplazar o borrar objetos bajo su propia carpeta UUID. Las URLs firmadas públicas se generan sólo para objetos vinculados a avisos activos.

## Pruebas después de publicar

- Abrí el sitio y confirmá que aparecen avisos activos, pero no borradores. Revisá imágenes en fichas y en el panel con una cuenta autorizada.
- Probá una consulta válida y confirmá que llega al CRM con origen `website`, etapa `new` y la propiedad correcta; verificá que el campo trampa no genere filas y que se aplique el límite de cinco consultas cada quince minutos.
- Comprobá que un visitante anónimo no puede insertar filas directamente en `leads` ni leer leads, perfiles ajenos o auditoría.
- Confirmá que las fotos del bucket privado sólo se entregan con URL firmada para avisos activos y que un borrador no obtiene URL pública.
- Verificá que cuentas `user` no entran al panel y que los roles de personal sólo permiten las operaciones previstas.
- Revisá los logs de las funciones y el workflow. No copies claves ni datos personales a los logs. Configurá MFA para las cuentas de administración de Supabase, GitHub y Cloudflare, y limitá quién puede editar workflows o secretos.

## Referencias

[1]: https://docs.github.com/en/actions/reference/security/secure-use "GitHub Actions secure use reference"
[2]: https://github.com/actions/checkout/commit/3d3c42e5aac5ba805825da76410c181273ba90b1 "Commit oficial de actions checkout"
[3]: https://github.com/pnpm/action-setup/commit/b906affcce14559ad1aafd4ab0e942779e9f58b1 "Commit oficial de pnpm action setup"
[4]: https://github.com/actions/setup-node/commit/949feb2413d6458794dcd2491c4babbbce0c15c1 "Commit oficial de actions setup node"
[5]: https://github.com/actions/upload-pages-artifact/commit/56afc609e74202658d3ffba0e8f6dda462b719fa "Commit oficial de actions upload pages artifact"
[6]: https://github.com/actions/deploy-pages/commit/d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e "Commit oficial de actions deploy pages"
[7]: https://pnpm.io/settings/build "Configuración oficial de scripts de dependencias en pnpm"
[8]: https://pnpm.io/cli/approve-builds "Comando oficial de revisión de scripts de build en pnpm"
[9]: https://github.com/advisories/GHSA-fc5q-39xc-vjpf "Advisory oficial de picomatch GHSA-fc5q-39xc-vjpf"
