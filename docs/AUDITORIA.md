# Auditoría del CRM inmobiliario RIVIERA

**Estado:** revisión del repositorio y del esquema Supabase existentes. El producto queda acotado a la operación interna de Inmobiliaria Riviera.

## Alcance confirmado

Se conserva el portal público y se amplía `/#/admin` con el CRM operativo. No se incorporará SaaS multiagencia, marketplace/bolsa colaborativa, colaboración entre inmobiliarias, suscripciones SaaS ni editor de imágenes con IA. El control de acceso seguirá siendo por roles internos de Riviera. No se deben presentar funciones simuladas o pendientes como si estuvieran operativas.

## Estado existente y brechas

El repositorio ya incluye un portal React/TypeScript/Vite en GitHub Pages y un panel administrativo con Supabase Auth, inventario, consultas, seguimientos, roles `owner`, `admin`, `manager`, `secretary` y `user`, bitácora, caja interna, calculadora y expedientes de alquiler. El esquema Supabase dispone de RLS por rol, bucket privado para imágenes y funciones Edge para capturar consultas y emitir URLs firmadas. La cola `welcome_automations` es una preparación interna: no prueba que email o WhatsApp se hayan enviado.

| Área | Estado | Qué completar |
|---|---|---|
| Dashboard | Inventario, consultas nuevas, tareas próximas/vencidas y actividad | Métricas por período/origen/etapa con definiciones claras, estados vacíos y trazabilidad |
| Propiedades | Ficha y editor con imágenes, campos técnicos y estados | Filtros adicionales, listas de interés, posibles textos IA sólo después y con revisión; sin editor de imágenes IA |
| Prospectos | CRM con campos declarados, etapas, prioridad y origen | Kanban, historial automático de etapa, filtro/segmentación, asignación, criterios de búsqueda completos |
| Tareas/calendario | Seguimientos internos vinculados a lead/propiedad | Vista calendario interna y prioridades; sincronización Google/Outlook queda para fase posterior |
| Equipo | Roles y gestión protegida por RPC | Revisar matriz de permisos, preferencias de notificaciones y trazabilidad |
| Finanzas | Calculadora y movimientos internos con monedas/estados | No equivale a contabilidad/facturación fiscal; no sumar monedas sin regla de conversión fechada |
| Comunicaciones | Enlaces externos y cola interna | No existe bandeja unificada ni envío automático verificado; separar respuesta solicitada y marketing |
| Privacidad | Casilla de consentimiento, RLS y rate limit del formulario | Evidencia del consentimiento, aviso de privacidad, retención y proceso de acceso/exportación/borrado |
| Marketing | Sitio estático existente y SEO básico | Web configurable por Riviera, formularios mejorados, blog/guías sólo en etapas futuras |
| Integraciones | Captura segura de formularios, Supabase Functions | Meta/WhatsApp Cloud, Google/Outlook e importadores requieren cuentas/permisos y adaptación backend |

## Correcciones de planteamiento

1. El panel actual y la instancia Supabase se tratan como entorno exclusivo de Riviera; no se reutilizarán para otras inmobiliarias. Los roles deben mantenerse aplicados en RLS y funciones backend, no sólo ocultando opciones en la UI.
2. WhatsApp, Instagram/Facebook, calendarios y correo no son funciones habilitadas por tener un enlace o una fila `queued`. Requieren proveedor y credenciales de servidor, consentimiento acorde al canal, permisos de plataforma, seguridad de webhooks, idempotencia y verificación del resultado.
3. Consentimiento para responder una consulta no significa consentimiento para campañas promocionales. No enviar mensajes de marketing automáticamente sin consentimiento específico y mecanismo de baja.
4. La agenda interna no equivale a sincronización externa. Mantenerla útil de forma autónoma; posponer sincronización hasta definir cuentas, permisos, zonas horarias y resolución de conflictos.
5. Los cálculos financieros son herramientas internas. No presentarlos como contabilidad o facturación; mostrar divisas separadas salvo que exista una tasa aprobada con fuente y fecha.
6. La IA no debe inventar características ni prometer precio/disponibilidad. El contenido generado será borrador revisable por una persona; no se incorporará editor de imágenes con IA.
7. El historial comercial y la auditoría son conceptos distintos: registrar transiciones de etapa para métricas y cronología; conservar bitácora de seguridad/operación con permisos restringidos.
8. Exportación/borrado de un prospecto debe contemplar seguimientos, eventos, archivos y snapshots de auditoría; borrar sólo la fila principal no garantiza supresión integral.

## Funciones adicionales recomendadas

- **MVP:** asignación de responsable; historial del embudo; filtros por etapa, origen y urgencia; exportación CSV restringida por rol; preferencias de notificaciones; permisos de lectura para rol de solo consulta; avisos de privacidad y evidencia del consentimiento.
- **Después:** documentos/ofertas/negociación y contratos con Storage privado; listas compartibles con vencimiento/revocación; importación/deduplicación de contactos y propiedades; reportes exportables; salud de integraciones; respaldo y restauración ensayados.
- **Fuera de alcance confirmado:** SaaS multiagencia, bolsa/colaboración entre agencias, suscripciones SaaS y editor de imágenes con IA.

## Riesgos prioritarios

- **Alto:** roles globales deben seguir limitados a Riviera; no cargar datos de otra inmobiliaria en esta instancia.
- **Alto:** consentimiento insuficiente para mensajes promocionales o automáticos.
- **Alto:** cambios de RLS/Storage sin prueba pueden cortar el portal, el equipo o los archivos.
- **Medio:** métricas engañosas si no se registra historial de etapas o no se define el período.
- **Medio:** snapshots de auditoría pueden retener datos personales después de borrar un prospecto.
- **Medio:** errores de moneda o estados pueden distorsionar el panel financiero interno.

## Pruebas críticas

Probar cuentas de cada rol interno, usuario sin permisos y visitante anónimo: lectura/escritura/borrado en propiedades, leads, seguimientos, finanzas y equipo; acceso a Storage; formulario público y límites; cambios de etapa e historial; manejo de fallos; exportación y errores de autorización. Usar datos de prueba y no borrar ni cambiar registros reales durante validación.
