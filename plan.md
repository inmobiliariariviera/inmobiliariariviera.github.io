# Plan — Portal Inmobiliario

## Alcance y enfoque

Crear una primera versión navegable de un portal inmobiliario elegante en español, inspirada en las capturas compartidas. La dirección visual principal es blanco con azul noche e índigo. La experiencia incluye catálogo, fichas completas y un flujo de publicación demostrativo. El encabezado ofrece Comprar, Alquilar, Vender y Contacto; Comprar filtra inmuebles en venta, Alquilar filtra alquileres y Vender abre WhatsApp al número 3544669550. Contacto despliega accesos circulares a Instagram, Facebook y WhatsApp; Instagram/Facebook quedan pendientes de sus perfiles reales. El botón superior Publicar se omite y la ruta de publicación sigue disponible en enlaces contextuales. No se asumirá que “Inmobiliaria Garro” sea el nombre real de la empresa. Nombre, logo, email y propiedades definitivas quedan listos para personalizarse cuando el usuario comparta esos datos.

El catálogo tendrá encabezado azul oscuro con Comprar, Alquilar, Vender y un menú Contacto que agrupa accesos circulares de Instagram, Facebook y WhatsApp; búsqueda y filtros por operación, zona y tipo; tarjetas con características y precio. La ficha detallada presenta documentación, superficie, ambientes, servicios, descripción, ficha técnica, galería navegable y ampliada, precio total y por unidad cuando aplique, asesor, compartir, contacto/WhatsApp y calculadora rápida. La calculadora incluirá gastos de escritura solo como referencia ilustrativa claramente advertida, no como cotización. La ruta Publicar incluirá tres pasos —datos básicos, ubicación, fotos y video—, avance visible y vista previa local.

Las publicaciones, precios, ambientes y ubicaciones del catálogo son ejemplos identificados como simulados. Las fotografías son ilustrativas, no verificadas para una propiedad concreta. El contexto de Traslasierra/Córdoba y USD se utiliza solo para esas fichas de muestra. Los datos que el usuario aporte más adelante reemplazarán esos ejemplos.

## Implementación

Usar la plantilla existente React + TypeScript + Vite + Tailwind, con Wouter para las rutas. El inventario público permanece como datos tipados de demostración dentro de `client/src/data/`; filtros, detalle, galería, compartir y calculadora funcionan en el navegador. La ruta `/publicar` será un flujo frontend: campos del borrador pueden guardarse localmente en el dispositivo, las fotografías se previsualizan desde archivos seleccionados en el navegador y los enlaces HTTPS admitidos de YouTube se validan y se muestran en un reproductor `youtube-nocookie`. El reproductor carga el video desde YouTube; no se suben archivos al portal ni se publica ni distribuye un aviso. Contacto ofrece redes en un desplegable con el logotipo de WhatsApp; el contacto telefónico/WhatsApp usa el número provisto y los enlaces oficiales de Instagram y Facebook se agregarán cuando se compartan. La carga inicial de la aplicación tiene un fade-in breve y respeta movimiento reducido. La inicialización dejó habilitados Server y Database, pero esta versión no escribirá en la base ni afirmará que hay un gestor de propiedades conectado. No se agrega autenticación sin datos y alcance correspondientes.

Rutas: `/` para explorar; `/propiedad/:slug` para la ficha; `/publicar` para el flujo demostrativo de carga; `/404` para el fallback provisto. Mantener `client/public/manus-routes.json` sincronizado. Las fotografías ilustrativas versionadas viven bajo `client/public/property-images/`.

Estructura del proyecto:

- `client/src/pages/`: catálogo, ficha, flujo demostrativo de publicación y no encontrado.
- `client/src/components/real-estate/`: cabecera y desplegable Contacto, icono WhatsApp, filtros, tarjetas, galería y calculadora.
- `client/src/data/`: propiedades de muestra y tipos explícitos.
- `client/src/App.tsx`: rutas.
- `client/src/index.css`: tokens blancos y azules, componentes y estilos responsive.
- `client/public/property-images/`: fotografías ilustrativas seleccionadas.
- `client/public/manus-routes.json`: manifiesto requerido de rutas.

## Diseño

**Movimiento de diseño:** portal editorial inmobiliario contemporáneo inspirado en las capturas: navegación azul noche, superficies blancas, tipografía limpia y una ficha asimétrica que pone las fotografías y la información técnica en primer plano.

**Principios centrales:** claridad de información; elegancia sin adornos superfluos; imagen y ubicación antes que texto promocional; acciones y estados accesibles y transparentes.

**Filosofía de color:** el blanco y los grises muy claros construyen amplitud y orden; azul marino y azul índigo transmiten solidez y orientan acciones. La paleta de marca es `#0D2942`, `#25358A`, `#F5F7F8`, `#FFFFFF` y `#5E6B78`. El verde queda reservado para etiquetas puntuales de documentación, siguiendo la referencia.

**Paradigma de layout:** cabecera horizontal de color azul noche; catálogo con buscador compacto y resultados; ficha asimétrica con galería ancha a la izquierda y panel independiente de precio/contacto a la derecha, apilado en móvil; el flujo de publicación usa tres etapas visibles y tarjetas de estado.

**Elementos distintivos:** isotipo lineal de casa y curvas topográficas; chips compactos para superficie, escritura y operación; panel de precio con unidad alineada arriba y calculadora contextual.

**Interacción:** filtros inmediatos; tarjetas y breadcrumb llevan al detalle; galería con controles, contador, teclado y ampliación; calculadora con resultado actualizado; compartir usa Web Share o copia el enlace; Contacto despliega los accesos circulares a redes; el flujo de publicación guarda un borrador solo local, previsualiza fotos y videos de YouTube con enlaces HTTPS/dominios y formatos admitidos, y muestra estados de carga; los contactos incompletos explican qué dato falta.

**Animación:** fade-in de opacidad al abrir la página (720 ms), más revelados suaves de abajo hacia arriba (18 px, 620 ms) al entrar las secciones principales en el viewport, con desfase breve entre bloques y activación una sola vez por navegación. Mantener transiciones de 150–220 ms en hover, chips, menú y cambio de foto. Respetar `prefers-reduced-motion` desactivando movimiento y scroll suave; evitar parallax y animaciones que retrasen la lectura.

**Tipografía:** Manrope para títulos y precios; Inter para navegación, filtros, datos y descripciones. Títulos de 32–40 px en escritorio y 26–30 px en móvil; cuerpo base 16 px; metadatos de 12–14 px.

**Esencia de marca:** portal inmobiliario local para descubrir, evaluar y consultar propiedades con claridad. Personalidad: confiable, cercana y directa.

**Voz:** títulos concretos, ubicación primero y llamados a la acción sin promesas. Ejemplos: “Encontrá el lugar que estás buscando.” / “Consultá los detalles de esta propiedad.”

**Wordmark e isotipo:** nombre comercial editable acompañado por un isotipo propio, contorno de techo/casa intersectado por líneas topográficas.

**Color de marca distintivo:** azul tinta profundo `#0D2942`, presente en encabezado, isotipo y títulos de acción.
