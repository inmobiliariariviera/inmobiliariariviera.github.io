

## Seguridad, publicación y validación
- [x] El formulario público de consultas usa una Edge Function con validación del lado servidor, Turnstile, límite de 5 envíos por 15 minutos por hash HMAC de IP y campos CRM controlados por el servidor.
- [x] El bucket `property-images` pasa a privado; el frontend sólo recibe URLs firmadas temporales para avisos activos y el panel usa firmas para personal autenticado.
- [x] Se añadieron políticas de Storage, revocación de inserción anónima de consultas y tabla privada de rate limit; el SQL convierte URLs públicas existentes a rutas de objetos.
- [x] GitHub Actions fija las acciones a SHA completos, usa permisos mínimos, ejecuta pruebas y auditorías antes del build; `pnpm-workspace.yaml` sólo permite scripts de build de dependencias revisadas.
- [x] Dependencias corregibles actualizadas y lockfile validado en modo congelado con pnpm 12.21.0. `pnpm audit --prod` no detecta vulnerabilidades conocidas.
- [x] La auditoría completa conserva el aviso alto GHSA-fc5q-39xc-vjpf en `picomatch` por la cadena Vite/Vitest de desarrollo; el advisory no lista parche. CI permite sólo ese hallazgo exacto y bloquea otros avisos.
- [x] `pnpm check`, 22 pruebas y `pnpm build:static` completados. Las Edge Functions pasaron transpilación sintáctica con esbuild; no se desplegaron a una cuenta real.
- [ ] Aplicar el SQL actualizado, configurar secretos de Supabase y variables públicas de GitHub, registrar dominios Turnstile y desplegar las dos Edge Functions antes de publicar el nuevo frontend.


## CRM inmobiliario y control operativo
- [ ] El panel privado conserva el acceso por Supabase Auth y agrega un embudo comercial con etapas, métricas de conversión, origen, propiedad, período y recomendaciones basadas en tiempos de respuesta y caídas por etapa.
- [ ] Los contactos permiten registrar presupuesto declarado, moneda, modalidad de pago, operación, interés, urgencia, zona, etiquetas, prioridad y consentimiento; la segmentación usa datos comerciales proporcionados y no infiere nivel socioeconómico sensible.
- [ ] Cada nuevo contacto puede generar un seguimiento y una plantilla de bienvenida; el sistema deja preparado el envío desacoplado para email/WhatsApp sin exponer credenciales en el frontend.
- [ ] El panel incluye una biblioteca de preguntas frecuentes editable, buscable y reutilizable desde la gestión de contactos, con registro de respuestas utilizadas.
- [ ] El editor de propiedades muestra una vista previa en vivo de la ficha mientras se cargan campos e imágenes, sin publicar ni subir hasta guardar.
- [ ] El panel incorpora una calculadora interna de precio, comisión, gastos, pago al dueño, margen porcentual y ganancia neta, con opción de asociar y guardar el cálculo.
- [ ] El panel incorpora ingresos, salidas, pagos a dueños, comisión y ganancia de Riviera; cada movimiento tiene estado pendiente/realizado/anulado, color visible, notas, fecha y auditoría protegida.
- [ ] Cada propiedad publicada conserva fecha de publicación y muestra una alerta al cumplir 90 días; la propiedad no se elimina automáticamente y la alerta puede convertirse en seguimiento.
- [ ] Las migraciones Supabase son idempotentes, tienen RLS por rol, índices y auditoría append-only; se validan en el proyecto `vejljxoxhlseyzoxbedb` antes de publicar.
- [ ] El build, las pruebas y la publicación de GitHub Pages se completan sin romper el catálogo público, las reseñas ni el menú móvil.
