# TODO — Portal Inmobiliario

## Catálogo público y navegación
- [x] La plataforma inmobiliaria está en español y toma como referencia las capturas compartidas; no presenta “Inmobiliaria Garro” como marca confirmada.
- [x] El diseño es elegante, principalmente blanco con azul noche e índigo, como la captura de referencia.
- [x] El encabezado azul oscuro presenta una identidad provisional y las acciones Comprar, Alquilar, Vender y Contacto; Comprar muestra inmuebles en venta, Alquilar muestra alquileres y Vender abre WhatsApp al 3544669550. No muestra el botón superior “Publicar”.
- [x] Contacto despliega las redes sociales con íconos circulares de Instagram, Facebook y el logotipo de WhatsApp; WhatsApp abre una consulta al número provisto y los perfiles no configurados informan que falta agregar su enlace.
- [ ] Vincular Instagram y Facebook a los perfiles oficiales cuando el usuario comparta sus URLs o nombres de cuenta.
- [x] La página hace un fade-in suave al abrirse y respeta `prefers-reduced-motion`.
- [x] Las secciones principales del catálogo, las fichas y el flujo de publicación se revelan suavemente cuando entran en pantalla, con secuencia breve y sin parallax.
- [x] Las animaciones y el desplazamiento suave respetan `prefers-reduced-motion` y no ocultan contenido cuando se solicita movimiento reducido.
- [x] La navegación permite explorar propiedades por ubicación geográfica, operación y tipo.
- [x] Las tarjetas de inmuebles muestran imagen, tipo de operación, título, ubicación, características principales y precio; los ejemplos de alquiler muestran valor mensual.
- [x] Los anuncios de demostración se identifican claramente como simulados y sus imágenes como ilustrativas, no como propiedades verificadas.
- [x] La interfaz mantiene una lectura utilizable en pantallas móviles.

## Ficha de propiedad y herramientas
- [x] La ficha detallada presenta etiquetas de operación y documentación, descripción, superficie, dormitorios, baños y otros atributos disponibles.
- [x] La ficha presenta un bloque de descripción y una ficha técnica con información de superficie, ambientes cuando están disponibles, documentación y atributos del aviso; los ambientes de los ejemplos se identifican como dato de muestra.
- [x] La galería permite navegar las fotografías y abrirlas en una vista ampliada; una ficha con una fotografía no muestra miniaturas duplicadas.
- [x] La ficha presenta el precio total y el precio por unidad de superficie cuando corresponde; para alquiler muestra el importe mensual.
- [x] La calculadora rápida permite calcular por superficie en venta o por cantidad de meses en alquiler.
- [x] La calculadora presenta los gastos de escritura únicamente como ejemplo orientativo y advierte que deben confirmarse antes de usarlo como cotización.
- [x] La ficha identifica a la inmobiliaria o al asesor con marca provisional y muestra el número de contacto aportado 3544669550, sin inventar un email.
- [x] La ficha ofrece llamada telefónica al número aportado, WhatsApp con mensaje de consulta por inmueble y acción compartir.

## Publicar y estado de carga
- [x] La acción Publicar conduce a un flujo con Paso 1 — Datos básicos, Paso 2 — Ubicación y Paso 3 — Fotos y video.
- [x] El flujo muestra el avance de esos pasos según el contenido que se completa.
- [x] El flujo permite previsualizar fotos seleccionadas localmente y videos de YouTube embebidos desde `youtube-nocookie`; limita los enlaces a HTTPS y a dominios/formatos de video admitidos, sin subir archivos ni afirmar que el aviso ya se publicó.
- [x] El borrador se guarda en el navegador/dispositivo, no en la base de datos del portal.
- [x] El WhatsApp 3544669550 quedó configurado; nombre, logo, email y URLs oficiales de Instagram/Facebook quedan pendientes de los datos que aporte el usuario.
