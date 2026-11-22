# Decisiones de producto y tecnología

1. **Continuidad:** ampliar el repositorio y panel actuales de RIVIERA; no reemplazar el portal ni copiar marca, textos o código de terceros.
2. **Alcance de organización:** producto para una inmobiliaria, Riviera. No se añadirá SaaS multiagencia, bolsa/colaboración entre inmobiliarias ni facturación por suscripción SaaS.
3. **Stack:** conservar React + TypeScript + Vite + Supabase; la web estática no contendrá secretos.
4. **Roles:** conservar `owner`, `admin`, `manager`, `secretary` y `user`; aplicar las decisiones en RLS/RPC además de la interfaz.
5. **Datos existentes:** no inferir consentimiento ni cambiar/borrar datos reales sin propósito y autorización verificables.
6. **Consentimiento:** autorización para responder no habilita marketing; automatizaciones permanecen preparadas/simuladas hasta proveedor y opt-out.
7. **IA:** contenido de texto, si se incorpora, usa hechos del registro y es borrador con revisión humana. No prometer precio/disponibilidad. Se excluye expresamente el editor de imágenes con IA.
8. **Finanzas:** calculadora/caja son controles internos, no facturación ni contabilidad fiscal; no sumar monedas distintas sin tasa aprobada y fechada.
9. **Integraciones:** modo simulado mientras falten permisos/credenciales; tokens sólo en backend seguro.
10. **Calendario:** agenda interna primero; sincronización Google/Outlook se posterga hasta definir cuentas, permisos, zona horaria y conflictos.
11. **Publicación:** trabajar en rama y PR; la integración a `main` es la liberación que publica GitHub Pages y no se realizará sin confirmación de salida.
12. **Privacidad:** documentar aviso y proceso de derechos/retención antes de lanzamiento general, con revisión local pertinente.
