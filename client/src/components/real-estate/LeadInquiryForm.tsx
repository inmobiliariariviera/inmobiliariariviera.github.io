import { useState, type FormEvent } from "react";
import { LoaderCircle, Mail, MessageSquareText, Phone, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import TurnstileWidget from "./TurnstileWidget";

const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? "";

type InquiryForm = { name: string; email: string; phone: string; message: string };

export default function LeadInquiryForm({ propertyId, propertyTitle }: { propertyId?: string; propertyTitle?: string }) {
  const title = propertyTitle?.trim() || "consulta inmobiliaria";
  const initialMessage = propertyId ? `Hola, me interesa la propiedad: ${title}.` : "Hola, quiero hacer una consulta inmobiliaria.";
  const [form, setForm] = useState<InquiryForm>({ name: "", email: "", phone: "", message: initialMessage });
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const client = supabase;
  if (!client) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!turnstileSiteKey) {
      toast.error("El formulario todavía no está configurado. Escribinos por WhatsApp.");
      return;
    }
    if (!form.email.trim() && !form.phone.trim()) {
      toast.error("Ingresá un email o un teléfono para que podamos responderte.");
      return;
    }
    if (!consent) {
      toast.error("Autorizá el uso de tus datos para poder enviar la consulta.");
      return;
    }
    if (!captchaToken) {
      toast.error("Completá la verificación anti-spam antes de enviar.");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await client.functions.invoke("submit-lead", {
        body: {
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          message: form.message.trim(),
          ...(propertyId ? { property_id: propertyId } : {}),
          contact_consent: true,
          website,
          turnstile_token: captchaToken,
        },
      });
      if (error || data?.success !== true) {
        toast.error(data?.error || "No se pudo enviar la consulta. Probá nuevamente o contactanos por WhatsApp.");
        return;
      }
      toast.success("Recibimos tu consulta. Nos pondremos en contacto.");
      setForm({ name: "", email: "", phone: "", message: initialMessage });
      setConsent(false);
      setWebsite("");
    } catch {
      toast.error("No se pudo enviar la consulta. Probá nuevamente o contactanos por WhatsApp.");
    } finally {
      setSending(false);
      setCaptchaToken("");
      setCaptchaReset((value) => value + 1);
    }
  };

  return (
    <section className="lead-inquiry-card" aria-labelledby="lead-inquiry-title">
      <div className="lead-inquiry-heading">
        <span><MessageSquareText size={18} /></span>
        <div><h2 id="lead-inquiry-title">{propertyId ? "Consultá por esta propiedad" : "Mandanos tu consulta"}</h2><p>{propertyId ? "Tu mensaje llegará al equipo inmobiliario." : "Contanos qué necesitás; el equipo inmobiliario te responderá."}</p></div>
      </div>
      <form onSubmit={submit}>
        <label><UserRound size={14} /><input required minLength={2} maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Tu nombre" /></label>
        <label><Mail size={14} /><input type="email" maxLength={320} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email (opcional)" /></label>
        <label><Phone size={14} /><input maxLength={80} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Teléfono (opcional)" /></label>
        <textarea required minLength={3} maxLength={4000} rows={4} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} aria-label="Mensaje" placeholder="Escribí tu consulta" />
        <label className="lead-honeypot" aria-hidden="true">Sitio web<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
        <label className="lead-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Autorizo a Riviera a usar estos datos sólo para responder esta consulta. Al menos un medio de contacto es necesario.</span></label>
        {turnstileSiteKey ? <div className="lead-captcha"><TurnstileWidget key={captchaReset} siteKey={turnstileSiteKey} onToken={setCaptchaToken} /></div> : <small className="lead-captcha-warning">La verificación anti-spam requiere configuración antes de habilitar el envío.</small>}
        <button type="submit" className="button button-primary" disabled={sending || !turnstileSiteKey || !captchaToken || !consent}>
          {sending ? <LoaderCircle className="spin" size={15} /> : <MessageSquareText size={15} />}
          {sending ? "Enviando…" : "Enviar consulta"}
        </button>
      </form>
      <small>La consulta se registra de forma privada en el panel. No publicamos tus datos.</small>
    </section>
  );
}
