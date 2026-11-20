

## Mejoras RIVIERA implementadas
- [x] El catálogo público limita las localidades a Traslasierra, Córdoba; se eliminaron las ubicaciones externas del selector, normalizador y pruebas.
- [x] El header público incorpora “Reseñas” con navegación suave desde otras rutas; Home incorpora reseñas aprobadas desde Supabase, estado vacío honesto y FAQ con respuestas cálidas e informativas.
- [x] El panel administrativo ofrece “Ver página pública” y el editor de propiedades muestra una vista previa lateral en tiempo real de título, ubicación, precio, superficie, características, descripción e imágenes locales.
- [x] El guardado de propiedades valida números finitos, genera slugs únicos, confirma la fila afectada con `select`, conserva rutas HTTPS/privadas y traduce errores frecuentes de RLS, Storage, perfiles y constraints.
- [x] La ficha de propiedad incorpora una calculadora orientativa con comisión, otros gastos, desglose visible, importe neto y supuestos explícitos.
- [x] Se agregaron estilos editoriales índigo/dorado y reglas responsive para Reseñas, FAQ, calculadora, preview lateral, header y botón/enlace de navegación.

## Seguridad, publicación y validación
- [x] El formulario público de consultas usa una Edge Function con validación del lado servidor, Turnstile, límite de 5 envíos por 15 minutos por hash HMAC de IP y campos CRM controlados por el servidor.
- [x] El bucket `property-images` pasa a privado; el frontend sólo recibe URLs firmadas temporales para avisos activos y el panel usa firmas para personal autenticado.
- [x] Se añadieron políticas de Storage, revocación de inserción anónima de consultas y tabla privada de rate limit; el SQL convierte URLs públicas existentes a rutas de objetos.
- [x] GitHub Actions fija las acciones a SHA completos, usa permisos mínimos, ejecuta pruebas y auditorías antes del build; `pnpm-workspace.yaml` sólo permite scripts de build de dependencias revisadas.
- [x] Dependencias corregibles actualizadas y lockfile validado en modo congelado con pnpm 12.21.0. `pnpm audit --prod` no detecta vulnerabilidades conocidas.
- [x] La auditoría completa conserva el aviso alto GHSA-fc5q-39xc-vjpf en `picomatch` por la cadena Vite/Vitest de desarrollo; el advisory no lista parche. CI permite sólo ese hallazgo exacto y bloquea otros avisos.
- [x] `pnpm check`, 22 pruebas y `pnpm build:static` completados. Las Edge Functions pasaron transpilación sintáctica con esbuild; no se desplegaron a una cuenta real.
- [ ] Aplicar el SQL actualizado, configurar secretos de Supabase y variables públicas de GitHub, registrar dominios Turnstile y desplegar las dos Edge Functions antes de publicar el nuevo frontend.
