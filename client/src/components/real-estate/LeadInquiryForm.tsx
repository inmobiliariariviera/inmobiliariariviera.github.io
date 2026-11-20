import { useState, type FormEvent } from "react";
import { LoaderCircle, Mail, MessageSquareText, Phone, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import TurnstileWidget from "./TurnstileWidget";

const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? "";

type InquiryForm = { name: string; email: string; phone: string; message: string };

export default function LeadInquiryForm({ propertyId, propertyTitle }: { propertyId?: string; propertyTitle: string }) {
  const [form, setForm] = useState<InquiryForm>({ name: "", email: "", phone: "", message: `Hola, me interesa la propiedad: ${propertyTitle}.` });
  const [sending, setSending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const client = supabase;
  if (!client || !propertyId) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!turnstileSiteKey) {
      toast.error("El formulario todavía no está configurado. Escribinos por WhatsApp.");
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
          property_id: propertyId,
          turnstile_token: captchaToken,
        },
      });
      if (error || data?.success !== true) {
        toast.error("No se pudo enviar la consulta. Probá nuevamente o contactanos por WhatsApp.");
        return;
      }
      toast.success("Recibimos tu consulta. Nos pondremos en contacto.");
      setForm({ name: "", email: "", phone: "", message: `Hola, me interesa la propiedad: ${propertyTitle}.` });
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
        <div><h2 id="lead-inquiry-title">Consultá por esta propiedad</h2><p>Tu mensaje llegará al equipo inmobiliario.</p></div>
      </div>
      <form onSubmit={submit}>
        <label><UserRound size={14} /><input required minLength={2} maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Tu nombre" /></label>
        <label><Mail size={14} /><input type="email" maxLength={320} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email (opcional)" /></label>
        <label><Phone size={14} /><input maxLength={80} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Teléfono (opcional)" /></label>
        <textarea required minLength={3} maxLength={4000} rows={4} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} aria-label="Mensaje" />
        {turnstileSiteKey ? <div className="lead-captcha"><TurnstileWidget key={captchaReset} siteKey={turnstileSiteKey} onToken={setCaptchaToken} /></div> : <small className="lead-captcha-warning">La verificación anti-spam requiere configuración antes de habilitar el formulario.</small>}
        <button type="submit" className="button button-primary" disabled={sending || !turnstileSiteKey || !captchaToken}>
          {sending ? <LoaderCircle className="spin" size={15} /> : <MessageSquareText size={15} />}
          {sending ? "Enviando…" : "Enviar consulta"}
        </button>
      </form>
      <small>Al enviar, tus datos serán usados para responder esta consulta.</small>
    </section>
  );
}
