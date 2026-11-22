-- Grant only the table operations used by trusted Edge Functions.
-- These privileges are not granted to anon or authenticated clients.
GRANT SELECT ON TABLE public.properties TO service_role;
GRANT SELECT, INSERT ON TABLE public.leads TO service_role;
GRANT INSERT ON TABLE public.welcome_automations TO service_role;
GRANT INSERT ON TABLE public.lead_events TO service_role;
GRANT SELECT ON TABLE public.profiles TO service_role;
GRANT SELECT, UPDATE ON TABLE public.audit_logs TO service_role;
