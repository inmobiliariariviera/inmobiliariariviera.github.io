# Portal Inmobiliario

Portal inmobiliario responsive en español, construido con React, TypeScript, Vite y Tailwind CSS. La interfaz sigue la referencia de diseño aportada: azul noche, blanco, índigo y fichas de propiedad con galería y panel de precio.

## Qué incluye

- Catálogo de propiedades con filtros por operación, localidad y tipo.
- Fichas con fotos ilustrativas, descripción, ficha técnica, documentación, precio por unidad y calculadora rápida.
- Acciones de contacto, teléfono y WhatsApp para el número provisto 3544669550; el menú Contacto agrupa los accesos circulares de Instagram, Facebook y WhatsApp, con su logotipo de marca. Instagram/Facebook quedan pendientes de sus URLs oficiales.
- Navegación superior Comprar, Alquilar, Vender y Contacto; Vender abre WhatsApp y el botón superior Publicar está retirado, mientras el formulario sigue disponible desde enlaces contextuales.
- Fade-in suave al cargar la página y revelados de secciones al entrar en pantalla, con soporte para `prefers-reduced-motion`.
- Flujo de publicación demostrativo con tres pasos, estado de avance, previsualización local de fotos y reproductor opcional para enlaces HTTPS válidos de YouTube.
- Diseño responsive para escritorio y móvil.

Las publicaciones, fotografías y ambientes incluidos son ejemplos de demostración, no avisos verificados. El flujo Publicar no envía anuncios: los borradores se guardan en el navegador, las imágenes seleccionadas solo se previsualizan localmente y los enlaces admitidos se reproducen desde YouTube usando `youtube-nocookie`; no se suben archivos de video al portal. El proyecto inicializó Server y Database, pero el catálogo de esta versión usa datos tipados en `client/src/data/properties.ts` y no escribe en esa base. No se activa almacenamiento de archivos, autenticación ni envío de consultas hasta configurar esos servicios y los datos reales de la inmobiliaria.

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

`pnpm build` genera el frontend en `dist/public/` y el servidor de producción en `dist/index.js`.

## Personalización

- Editá el inventario de ejemplo en `client/src/data/properties.ts` y reemplazá títulos, datos, precios e imágenes por información verificada.
- Colocá las fotografías propias en `client/public/property-images/` y actualizá las rutas de imagen en los anuncios.
- Ajustá marca, navegación y contacto en `client/src/components/real-estate/SiteHeader.tsx` y `client/src/components/real-estate/PropertyAside.tsx`.
- Cambiá textos, metadatos y tokens visuales en `client/index.html` y `client/src/index.css`.

Antes de publicar el sitio, configurá el nombre y logo definitivos, teléfono/WhatsApp y email reales, reemplazá las propiedades de muestra y conectá almacenamiento seguro de fotos y un flujo persistente de publicación. La fila de escrituración al 8% se presenta solo como ejemplo visual y no como cotización; debe validarse según operación y jurisdicción.

## Rutas principales

- `/` — catálogo.
- `/propiedad/:slug` — ficha de inmueble.
- `/publicar` — borrador local de publicación.
- `/404` — página no encontrada.
