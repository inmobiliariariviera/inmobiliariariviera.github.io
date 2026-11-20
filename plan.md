# Plan — Portal Inmobiliario

## Alcance y enfoque

El portal se identifica como RIVIERA, ubicado en Loma Bola, Traslasierra, Córdoba; ofrece catálogo, fichas completas y un flujo de publicación demostrativo. El encabezado ofrece Comprar, Alquilar, Vender, Contacto, una búsqueda expandible dentro de la misma fila del header fijo y un selector de modo claro/oscuro persistente. Marca, enlaces y lupa comparten una alineación vertical equilibrada inspirada en la referencia De Raíz Vivero; al abrir la búsqueda, los enlaces se desplazan lateralmente sin ocultar sus títulos ni crear un subheader. El filtro de ubicación limita el catálogo a Traslasierra, Córdoba, y Merlo, San Luis. Comprar filtra inmuebles en venta, Alquilar filtra alquileres y Vender abre WhatsApp al contacto configurado. El contacto público ofrece WhatsApp, Instagram (@inmobiliaria.riviera), YouTube (Inmobiliaria.Riviera) y Facebook para compartir el portal; el footer compacto reúne isotipo, marca, Gmail (inmobiliariavirieraok@gmail.com) con enlace mailto, botones cuadrados iguales de Instagram, YouTube y Facebook, y copyright. El botón genérico “Llamanos” no aparece. El aviso general de demostración y la etiqueta “Aviso de muestra” se retiraron por pedido, pero los datos fallback siguen siendo ejemplos y deben reemplazarse por información confirmada antes de publicar.

El catálogo tiene un header fijo y translúcido con navegación con brillo y un buscador que se expande en la misma fila: el campo queda entre la marca y los enlaces, que se desplazan lateralmente sin ocultarse ni crear un subheader. La marca, los textos y la lupa se alinean al centro vertical del header. El espaciado y los controles se compactan con cuidado en tablet y móvil. La lupa y el campo conservan movimientos opuestos. El selector claro/oscuro es persistente. El catálogo limita la búsqueda geográfica a Traslasierra, Córdoba, y Merlo, San Luis. Las secciones públicas usan fondos editoriales de baja intensidad en índigo y dorado; el hero no muestra contadores “01/03” ni el botón “Explorar propiedades” junto a su rótulo. Las tarjetas muestran características y precio sin la etiqueta “Aviso de muestra”. El footer editorial de RIVIERA conserva isotipo, marca, Gmail con enlace y copyright, además de tres accesos sociales cuadrados e idénticos, sin repetir navegación ni ubicación. La ficha inicia arriba con el título visible; presenta documentación, superficies total/cubierta (la cubierta opcional se indica “A consultar” si falta), ambientes, servicios, descripción, ficha técnica y galería en visor de pantalla completa con X visible. Muestra precio y acciones de contacto/compartir, sin calculadora, tarjeta genérica de inmobiliaria, leyendas de fotos de referencia ni distintivos de simulación solicitados. Los botones laterales reacomodan “Compartir” a una fila completa para evitar recortes. La ruta Publicar incluye tres pasos, avance visible y vista previa local.

Las publicaciones, precios, ambientes y ubicaciones del catálogo son ejemplos identificados como simulados. Las fotografías son ilustrativas, no verificadas para una propiedad concreta. El contexto de Traslasierra/Córdoba y USD se utiliza solo para esas fichas de muestra. Los datos que el usuario aporte más adelante reemplazarán esos ejemplos.

## Implementación

La referencia visual aportada orienta la interfaz: header fijo de 64 px con fondo de vidrio, línea animada contenida, logo y navegación alineados, búsqueda expandible en la misma fila, brillo al cursor y modo claro/oscuro persistente. Los fondos secciones usan motivos geométricos y halos suaves de índigo y dorado, con contraste adaptable a tema oscuro. El footer usa el logotipo oficial azul cobalto/azul claro, botones sociales en sus colores de marca y copyright con halo exterior. Usar Cormorant Garamond en títulos y Manrope en interfaz/cuerpo; mantener contraste, foco accesible y compatibilidad con `prefers-reduced-motion`.

Mantener React + TypeScript + Vite + Tailwind y Wouter. El inventario lo administra Supabase mediante Auth, Postgres y Storage desde el SDK oficial con `VITE_SUPABASE_URL` y la clave pública `VITE_SUPABASE_ANON_KEY`; nunca exponer `service_role`. Los roles `owner`, `admin`, `manager` y `secretary` tienen permisos RLS diferenciados. El panel `/#/admin` ofrece equipo/roles, inventario, CRM y seguimientos; auditoría append-only por triggers sólo para dueño/administrador. Los usuarios nuevos comienzan sin acceso y sólo owner/admin pueden asignar roles vía RPC segura; nadie modifica su propio cargo y no puede quedar el sistema sin dueño. Los anuncios locales sólo se muestran como demostración cuando no hay configuración Supabase. `/#/publicar` sigue siendo vista previa local. GitHub Pages recibe el build estático `dist/public`, navegación hash y recursos relativos; GitHub Actions despliega desde `main`.

Rutas hash: `/#/` para explorar; `/#/propiedad/:slug` para la ficha; `/#/publicar` para el flujo demostrativo; `/#/admin` para administración; `/#/404` y el fallback de ruta desconocida para el error React. `client/public/404.html` cubre rutas limpias inexistentes que GitHub Pages responde con HTTP 404. Ambas páginas 404 centran el contenido respecto del viewport en escritorio y móvil. Mantener `client/public/app-routes.json` sincronizado. Las fotografías ilustrativas viven bajo `client/public/property-images/`.

Estructura del proyecto:

- `client/src/pages/`: catálogo, ficha, flujo demostrativo, panel privado y no encontrado.
- `client/src/components/real-estate/`: cabecera con navegación a Contacto, búsqueda y selector de tema, icono WhatsApp, filtros, tarjetas y galería.
- `client/src/data/`: propiedades de muestra y tipos explícitos.
- `client/src/lib/supabase.ts` y `usePublicProperties.ts`: cliente Supabase y carga pública de avisos.
- `supabase/schema.sql`: modelo, RLS, Storage y auditoría.
- `client/src/pages/Admin.tsx`: panel, permisos visibles y módulo de equipo.
- `client/public/404.html`: página estática de error para GitHub Pages.
- `.github/workflows/deploy.yml`: build y despliegue estático de GitHub Pages.
- `client/src/App.tsx`: rutas.
- `client/src/index.css`: tokens blancos y azules, componentes y estilos responsive.
- `client/public/property-images/`: fotografías ilustrativas seleccionadas.
- `client/public/app-routes.json`: manifiesto requerido de rutas.

## Diseño

**Movimiento de diseño:** portal editorial inmobiliario contemporáneo inspirado en las capturas: navegación azul noche, superficies blancas, tipografía limpia y una ficha asimétrica que pone las fotografías y la información técnica en primer plano.

**Principios centrales:** claridad de información; elegancia sin adornos superfluos; imagen y ubicación antes que texto promocional; acciones y estados accesibles y transparentes.

**Filosofía de color:** el blanco y los grises muy claros construyen amplitud y orden; azul marino y azul índigo transmiten solidez y orientan acciones. La paleta de marca es `#0D2942`, `#25358A`, `#F5F7F8`, `#FFFFFF` y `#5E6B78`. El verde queda reservado para etiquetas puntuales de documentación, siguiendo la referencia.

**Paradigma de layout:** cabecera horizontal de color azul noche; catálogo con buscador compacto y resultados; ficha asimétrica con galería ancha a la izquierda y panel independiente de precio/contacto a la derecha, apilado en móvil; el flujo de publicación usa tres etapas visibles y tarjetas de estado.

**Elementos distintivos:** marca tipográfica RIVIERA acompañada por el isotipo montañoso existente; chips compactos para superficie total/cubierta, escritura y operación; panel de precio con unidad alineada arriba y “A consultar” para datos cubiertos ausentes.

**Interacción:** filtros inmediatos; tarjetas y breadcrumb llevan al detalle; galería con controles, contador, teclado y ampliación; compartir usa Web Share o copia el enlace; Contacto enlaza WhatsApp, Instagram, YouTube y Facebook para compartir el portal, y el Gmail se abre desde el pie; el modo visual se puede alternar y recuerda la elección; el editor del panel guarda superficie cubierta opcional en Supabase; el flujo de publicación guarda un borrador sólo local, previsualiza fotos y videos de YouTube y muestra estados de carga.

**Animación:** fade-in de opacidad al abrir la página (720 ms), más revelados suaves de abajo hacia arriba (18 px, 620 ms) al entrar las secciones principales en el viewport, con desfase breve entre bloques y activación una sola vez por navegación. Mantener transiciones de 150–220 ms en hover, chips, menú y cambio de foto. Respetar `prefers-reduced-motion` desactivando movimiento y scroll suave; evitar parallax y animaciones que retrasen la lectura.

**Tipografía:** Cormorant Garamond para títulos y Manrope para interfaz, navegación, filtros, datos y descripciones. Mantener jerarquía de lectura y metadatos compactos.

**Esencia de marca:** portal inmobiliario local para descubrir, evaluar y consultar propiedades con claridad. Personalidad: confiable, cercana y directa.

**Voz:** títulos concretos, ubicación primero y llamados a la acción sin promesas. Ejemplos: “Encontrá el lugar que estás buscando.” / “Consultá los detalles de esta propiedad.”

**Wordmark e isotipo:** nombre comercial editable acompañado por un isotipo propio, contorno de techo/casa intersectado por líneas topográficas.

**Color de marca distintivo:** azul tinta profundo `#0D2942`, presente en encabezado, isotipo y títulos de acción.


## Ampliación: operación organizada y auditoría
El panel incluirá resumen operativo, consultas/contactos (CRM), seguimientos con vencimiento y auditoría. Las consultas del formulario de ficha se guardan en Supabase y aparecen en el panel con etapas nuevo, contactado, visita, negociación, ganado o perdido; también se pueden incorporar contactos manualmente. Seguimientos con fecha y estado pendiente/completado pueden asociarse a una consulta o propiedad. La auditoría registrará de forma append-only creación/edición/cambio de estado/eliminación de propiedades, leads y tareas, con actor, fecha, entidad y snapshots anterior/nuevo; RLS permitirá lectura sólo a administradores y sólo triggers de base de datos insertarán eventos. El dashboard resume inventario, consultas nuevas, seguimientos vencidos/próximos y actividad reciente.


## Ampliación: CRM inmobiliario y control operativo

La ampliación conserva la web pública y convierte `/#/admin` en un CRM privado con módulos de embudo, contactos, propiedades, finanzas, calculadora y alertas. La base seguirá siendo Supabase Auth + Postgres + Storage + RLS; el navegador sólo usará la publishable key.

### Alcance funcional

- Embudo comercial configurable: Nuevo, Contactado, Visita, Negociación, Ganado y Perdido, con métricas de conversión por etapa, origen, propiedad y período. Las estrategias se mostrarán como recomendaciones operativas basadas en datos observables: tiempos de respuesta, etapa con mayor caída, fuente con mejor conversión y propiedades con más consultas.
- Contactos enriquecidos con presupuesto declarado, moneda, modalidad de pago, tipo de operación, interés, urgencia, zona, etiquetas, nivel de prioridad y consentimiento de contacto. La segmentación será comercial y declarada por el contacto; no se inferirá nivel socioeconómico sensible a partir de nombre, domicilio u otras señales.
- Seguimiento automático de bienvenida: al crear un contacto desde la web se registra una automatización pendiente, se asigna una respuesta/plantilla de bienvenida y se crea el primer seguimiento. El envío externo real queda desacoplado para conectarlo a un proveedor de email o WhatsApp autorizado, sin guardar credenciales en el frontend.
- Centro de respuestas frecuentes: biblioteca editable de preguntas y respuestas, con búsqueda y copia rápida desde el detalle de cada contacto; se registran las respuestas usadas para medir qué dudas aparecen y qué contenidos convierten.
- Vista previa en vivo del editor de propiedades: el panel mostrará la ficha mientras se completan datos y se seleccionan imágenes, sin publicar ni subir archivos hasta guardar.
- Calculadora interna: precio/comisión, gastos, pago a propietario, margen de Riviera y resultado neto; permite guardar un cálculo asociado a una propiedad u operación si el usuario lo desea.
- Finanzas y auditoría: ingresos, salidas, pagos a propietarios, comisiones y porcentaje de ganancia, con estado pendiente/realizado/anulado, color por estado, notas, fecha y asociación a propiedad/contacto. Sólo owner/admin podrá crear, editar o anular movimientos; la auditoría será append-only.
- Alertas de publicación: cada propiedad publicada conservará fecha de publicación y fecha objetivo a 90 días. Al llegar el plazo se mostrará una alerta persistente en el panel y se podrá crear un seguimiento; nunca se eliminará automáticamente la propiedad.

### Modelo propuesto

Se añadirán tablas `contact_profiles`/campos CRM sobre `leads`, `sales_funnel_events`, `welcome_automations`, `faq_entries`, `financial_transactions`, `calculator_runs` y `property_alerts` o columnas equivalentes en `properties`. Cada tabla tendrá índices, RLS por rol y triggers de `updated_at`/auditoría. Las migraciones serán idempotentes y se aplicarán mediante el SQL del proyecto Supabase.

### Diseño

El panel mantendrá la identidad editorial de RIVIERA, pero incorporará un resumen de operación con tarjetas de conversión, alertas y caja; tablas con filtros; chips de color para estados financieros; un tablero de embudo; y un editor de propiedad dividido entre formulario y vista previa. En móvil los módulos se apilan y los estados conservan contraste accesible.

### Entrega por fases

Fase 1: migración segura de datos, tipos Supabase, embudo enriquecido, contactos segmentables y dashboard comercial.

Fase 2: vista previa de propiedades, calculadora, finanzas y auditoría de movimientos.

Fase 3: alertas de 90 días, biblioteca FAQ, automatización de bienvenida y validación integral del panel.
