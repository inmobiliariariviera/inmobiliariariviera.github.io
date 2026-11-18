

## Seguridad, publicación y validación
- [x] El formulario público de consultas usa una Edge Function con validación del lado servidor, Turnstile, límite de 5 envíos por 15 minutos por hash HMAC de IP y campos CRM controlados por el servidor.
- [x] El bucket `property-images` pasa a privado; el frontend sólo recibe URLs firmadas temporales para avisos activos y el panel usa firmas para personal autenticado.
- [x] Se añadieron políticas de Storage, revocación de inserción anónima de consultas y tabla privada de rate limit; el SQL convierte URLs públicas existentes a rutas de objetos.
- [x] GitHub Actions fija las acciones a SHA completos, usa permisos mínimos, ejecuta pruebas y auditorías antes del build; `pnpm-workspace.yaml` sólo permite scripts de build de dependencias revisadas.
- [x] Dependencias corregibles actualizadas y lockfile validado en modo congelado con pnpm 12.21.0. `pnpm audit --prod` no detecta vulnerabilidades conocidas.
- [x] La auditoría completa conserva el aviso alto GHSA-fc5q-39xc-vjpf en `picomatch` por la cadena Vite/Vitest de desarrollo; el advisory no lista parche. CI permite sólo ese hallazgo exacto y bloquea otros avisos.
- [x] `pnpm check`, 22 pruebas y `pnpm build:static` completados. Las Edge Functions pasaron transpilación sintáctica con esbuild; no se desplegaron a una cuenta real.
- [ ] Aplicar el SQL actualizado, configurar secretos de Supabase y variables públicas de GitHub, registrar dominios Turnstile y desplegar las dos Edge Functions antes de publicar el nuevo frontend.
