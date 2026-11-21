# RIVIERA — Portal Inmobiliario

Portal inmobiliario responsive en español, construido con React, TypeScript, Vite y Tailwind CSS. La interfaz sigue la referencia de diseño aportada: azul noche, blanco, índigo y fichas de propiedad con galería y panel de precio.

## Qué incluye

- Catálogo de propiedades con filtros por operación y tipo; la ubicación se limita a Traslasierra, Córdoba, y Merlo, San Luis.
- Fichas con galería, descripción y ficha técnica, incluida superficie cubierta opcional; cuando no se carga, muestra “A consultar”.
- Acciones de contacto, teléfono y WhatsApp para el número provisto 3544669550; el enlace Contacto del encabezado lleva a la sección de contacto en la página principal.
- Navegación superior Comprar, Alquilar, Vender y Contacto; Vender abre WhatsApp y el botón superior Publicar está retirado, mientras el formulario sigue disponible desde enlaces contextuales.
- Fade-in suave al cargar la página y revelados de secciones al entrar en pantalla, con soporte para `prefers-reduced-motion`.
- Header fijo de 64 px con transparencia/blur y marca, enlaces y lupa alineados al centro vertical; al abrir la búsqueda, el campo crece en la misma fila entre la marca y la navegación, y los enlaces se desplazan hacia el costado sin ocultarse ni abrir una segunda barra. El layout conserva aire en desktop y se compacta en móvil. Incluye selector claro/oscuro persistente. El hero no muestra el contador 01/03. Los fondos de las secciones usan motivos tenues en índigo y dorado. El footer compacto reúne isotipo, marca, enlace Gmail, tres botones sociales cuadrados del mismo tamaño y copyright, sin repetir navegación ni ubicación.
- Flujo de publicación demostrativo con tres pasos, estado de avance, previsualización local de fotos y reproductor opcional para enlaces HTTPS válidos de YouTube.
- Diseño responsive para escritorio y móvil.

Las propiedades que vienen en el ZIP son datos de ejemplo y no deben tratarse como publicaciones verificadas. Sin credenciales de Supabase, se usan como fallback; una vez configurado el proyecto, el catálogo lee propiedades desde Supabase. El flujo `Publicar` sigue siendo una vista previa local y no publica anuncios. El panel `/#/admin` permite administrar inventario, consultas, seguimientos y auditoría; fotos cargadas desde el panel se guardan en Supabase Storage. Para iniciar el uso real hay que aplicar `supabase/schema.sql`, crear usuarios del equipo y configurar URL/clave pública. La bitácora guarda cambios en la base mediante triggers.

## Requisitos

Node.js compatible con Vite 7 y pnpm 10. El proyecto fija `pnpm@10.18.0` en `package.json`.

## Desarrollo local

```bash
pnpm install
pnpm dev
```

El servidor usa `PORT` si está definido; por defecto escucha en el puerto 3000. Abrí `http://localhost:3000` en el navegador.

## Comprobaciones y compilación

```bash
pnpm check
pnpm test
pnpm build
pnpm start
```

`pnpm build` genera el frontend en `dist/public/` y el servidor de producción en `dist/index.js`. Para GitHub Pages, usar `pnpm build:static`, que sólo genera los archivos estáticos requeridos en `dist/public/`.

## Personalización

- Editá el inventario de ejemplo en `client/src/data/properties.ts` y reemplazá títulos, datos, precios e imágenes por información verificada.
- Colocá las fotografías propias en `client/public/property-images/` y actualizá las rutas de imagen en los anuncios.
- Ajustá marca, navegación y contacto en `client/src/components/real-estate/SiteHeader.tsx`, `SiteFooter.tsx` y `client/src/components/real-estate/PropertyAside.tsx`. El isotipo montañoso transparente se guarda en `client/public/riviera-brand-mark.png`.
- Cambiá textos, metadatos y tokens visuales en `client/index.html` y `client/src/index.css`.

La marca RIVIERA está configurada con el isotipo montañoso recibido. El correo público es inmobiliariavirieraok@gmail.com; Instagram apunta a @inmobiliaria.riviera y YouTube al canal Inmobiliaria.Riviera. El botón de Facebook comparte el portal hasta que se proporcione la URL de la página oficial. Confirmá teléfono y redes antes de publicar. La clave de navegador de Supabase debe ser anon/publishable y las políticas RLS del SQL deben estar aplicadas; nunca publiques la clave `service_role`. La fila de escrituración al 8% se presenta sólo como ejemplo visual y no como cotización; debe validarse según operación y jurisdicción.

## Rutas principales

- `/#/` — catálogo.
- `/#/propiedad/:slug` — ficha de inmueble.
- `/#/publicar` — borrador local de publicación.
- `/#/admin` — panel del equipo.
- `/#/404` — página no encontrada.

## Panel de administración, Supabase y GitHub Pages

La versión actual incluye un panel de gestión en `/#/admin`, CRM de consultas, agenda de seguimientos, bitácora automática y equipo con cuatro cargos: `owner`, `admin`, `manager` y `secretary`. Para activar la conexión, seguí la guía [README-GITHUB-PAGES.md](README-GITHUB-PAGES.md): configurar Supabase, ejecutar `supabase/schema.sql`, crear la cuenta dueña inicial y guardar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en GitHub Actions. La clave `service_role` nunca debe exponerse en el navegador.

La página principal también incluye un formulario público de reseñas. Las reseñas se guardan como pendientes en `public.reviews` y el equipo puede aprobarlas, ocultarlas o eliminarlas desde la pestaña `Reseñas` del panel. El botón de Google Maps usa `GOOGLE_REVIEW_URL` en `client/src/components/real-estate/ReviewsSection.tsx`; reemplazá ese valor por el enlace exacto “Pedir reseñas” de tu Perfil de Empresa de Google para dirigir a los clientes a la ficha correcta.

`pnpm build:static` genera el sitio en `dist/public`; `.github/workflows/deploy.yml` publica ese directorio en GitHub Pages al enviar cambios a `main`. Las rutas hash permiten actualizar directamente el panel y las fichas sin configurar reescrituras de servidor.
