# Arquitectura — RIVIERA CRM

## Producto y estado

Producto interno de Inmobiliaria Riviera, con catálogo público y panel administrativo en `/#/admin`. No se diseña como SaaS multiagencia; la instancia Supabase y los datos del CRM son exclusivos de Riviera. Stack existente: React 19 + TypeScript + Vite + Wouter, despliegue estático por GitHub Pages, Supabase Auth/Postgres/Storage/RLS y Edge Functions. El navegador sólo utiliza la clave pública anon/publishable; `service_role` queda en servidor.

## Capas

- **Web pública:** catálogo, fichas, formularios y reseñas; conservar rutas hash, marca, filtros y seguridad actuales.
- **Panel:** resumen, propiedades, prospectos/pipeline, agenda interna, finanzas operativas, reseñas, alquileres, equipo y auditoría.
- **Auth/roles:** Supabase Auth y los roles de Riviera `owner`, `admin`, `manager`, `secretary` y `user`. Las funciones SQL/RLS son la frontera de autorización; ocultar controles en React no reemplaza permisos de base.
- **Postgres:** fuente de verdad; las entidades CRM enlazan con propiedades, usuarios y seguimientos mediante claves foráneas e índices.
- **Storage:** bucket privado para fotos y documentos internos. Las URLs firmadas son temporales y se autorizan en base al rol y estado de publicación.
- **Edge Functions:** captura pública, rate limiting, firma de medios e integraciones que requieran secretos. Verificar input/origen, rol, idempotencia y límites.
- **Canales externos:** mantener integraciones desactivadas/simuladas hasta tener proveedor y credenciales. No almacenar tokens en frontend, variables `VITE_*`, repositorio ni logs.

## Modelo CRM existente

`profiles` guarda identidad y rol; `properties` contiene inventario; `leads` contiene prospectos, origen, etapa y criterios comerciales declarados; `lead_events` mantiene historial del embudo; `follow_ups` contiene próximos pasos; `audit_logs` registra cambios; `welcome_automations` prepara estados de comunicaciones; `faq_entries`, `calculator_runs`, `financial_transactions` y `rental_dossiers` cubren operación adicional. Las referencias y políticas actuales son de una inmobiliaria.

Para analítica se deben usar eventos históricos, no sólo el estado actual. Cada métrica documenta período, zona horaria, numerador, denominador y exclusiones. Los importes conservan moneda original; no se consolidan monedas sin una regla aprobada con fecha/fuente.

## Seguridad y privacidad

Aplicar mínimo privilegio por rol; proteger datos financieros, equipo y auditoría; restringir llamadas RPC `SECURITY DEFINER` con `search_path` fijo y permisos `EXECUTE` mínimos; validar actor y autorización en funciones Edge con privilegios. El consentimiento para responder no autoriza marketing. Definir aviso, retención, acceso, exportación, rectificación y supresión, incluidas filas dependientes, Storage y snapshots.

## Roadmap interno

1. **MVP CRM Riviera:** auth/equipo, propiedades, prospectos, embudo e historial, agenda interna, dashboard y formularios/listas compartibles; preservar la web pública.
2. **Operación:** calendario interno más usable, documentos/ofertas, reportes/exportación, privacidad/derechos y notificaciones por usuario.
3. **Marketing Riviera:** ajustes del sitio, SEO/GEO, links, guías y blog IA con revisión humana.
4. **Comunicaciones:** bandeja unificada, WhatsApp/Meta y calendarios externos tras permisos, credenciales, consentimiento, pruebas de envío y modo simulado.
5. **Asistencia IA y automatización:** descripción textual a partir de datos reales, score explicable y asistencia WhatsApp con transferencia humana. **No editor de imágenes con IA.**
6. **Importación y lanzamiento:** importadores (cuando Riviera provea credenciales), monitoreo, backups/restore, endurecimiento y soporte. Sin planes SaaS ni administración de múltiples agencias.

## Estructura

- `client/src/pages/Admin.tsx`: consola y navegación del panel.
- `client/src/components/real-estate/`: componentes CRM, finanzas y alquileres.
- `client/src/lib/`: cliente Supabase y utilidades.
- `supabase/migrations/`: cambios de base versionados.
- `supabase/functions/`: endpoints Edge e integraciones seguras.
- `docs/`: auditoría, arquitectura y decisiones.
- `.github/workflows/`: CI y publicación del portal.

## Liberación

Migraciones versionadas, aditivas y verificadas. En Supabase, confirmar respaldo y estado del esquema antes de cambiar permisos o datos; no ejecutar SQL destructivo ni usar datos reales para pruebas destructivas. Mantener los checks de TypeScript, tests, build y flujos de catálogo/fichas antes de integrar. El merge a `main` dispara GitHub Pages y se trata como liberación separada.
