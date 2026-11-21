import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, LoaderCircle, Mail, MessageSquareText, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { createWhatsAppUrl } from "@/lib/contact";
import { supabase } from "@/lib/supabase";
import TurnstileWidget from "./TurnstileWidget";
import WhatsAppIcon from "./WhatsAppIcon";

const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? "";
const quickQuestions = ["¿Sigue disponible?", "Quiero coordinar una visita", "¿Me cuentan más detalles?"];

type InquiryForm = { name: string; email: string; phone: string; message: string };

export default function LeadInquiryForm({ propertyId, propertyTitle }: { propertyId?: string; propertyTitle?: string }) {
  const title = propertyTitle?.trim() || "esta propiedad";
  const initialMessage = propertyId
    ? `Hola, me interesa la propiedad: ${title}.`
    : "Hola, quiero hacer una consulta inmobiliaria.";
  const [form, setForm] = useState<InquiryForm>({ name: "", email: "", phone: "", message: initialMessage });
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const client = supabase;
  if (!client) return null;

  const hasContactMethod = Boolean(form.email.trim() || form.phone.trim());

  const addQuickQuestion = (question: string) => {
    setForm((current) => {
      const currentMessage = current.message.trim();
      return {
        ...current,
        message: currentMessage.includes(question) ? currentMessage : `${currentMessage}\n${question}`.trim(),
      };
    });
    messageRef.current?.focus();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!turnstileSiteKey) {
      toast.error("El formulario todavía no está configurado. Escribinos por WhatsApp.");
      return;
    }
    if (!hasContactMethod) {
      toast.error("Dejanos un email o teléfono para poder responderte.");
      return;
    }
    if (!consent) {
      toast.error("Autorizá el uso de tus datos para poder enviar la consulta.");
      return;
    }
    if (!captchaToken) {
      toast.error("Completá la verificación antes de enviar.");
      return;
    }

    setSending(true);
    setSent(false);
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
        toast.error(data?.error || "No se pudo enviar la consulta. Probá nuevamente o escribinos por WhatsApp.");
        return;
      }
      setSent(true);
      setForm({ name: "", email: "", phone: "", message: initialMessage });
      setConsent(false);
      setWebsite("");
      toast.success("Consulta recibida. Gracias por escribirnos.");
    } catch {
      toast.error("No se pudo enviar la consulta. Probá nuevamente o escribinos por WhatsApp.");
    } finally {
      setSending(false);
      setCaptchaToken("");
      setCaptchaReset((value) => value + 1);
    }
  };

  const whatsappMessage = propertyId
    ? `Hola, me interesa la propiedad: ${title}. ¿Me pueden contar más?`
    : "Hola, quiero hacer una consulta inmobiliaria.";

  return (
    <section id={propertyId ? "property-inquiry-form" : "general-inquiry-form"} className="lead-inquiry-card" aria-labelledby="lead-inquiry-title">
      <div className="lead-inquiry-heading">
        <span className="lead-inquiry-icon"><MessageSquareText size={21} /></span>
        <div>
          <span className="lead-inquiry-kicker">CONSULTA SIN COMPROMISO</span>
          <h2 id="lead-inquiry-title">{propertyId ? "¿Te gustaría saber más?" : "¿En qué podemos ayudarte?"}</h2>
          <p>{propertyId ? "Preguntanos lo que quieras. Podemos ampliar la información o ayudarte a coordinar una visita." : "Contanos qué estás buscando y nuestro equipo podrá orientarte."}</p>
        </div>
      </div>

      {propertyId && <div className="lead-property-context"><span>Tu consulta es sobre</span><strong>{title}</strong></div>}

      {sent && <div className="lead-success-message" role="status" aria-live="polite">
        <CheckCircle2 size={21} />
        <div><strong>¡Gracias por escribirnos!</strong><p>Recibimos tu consulta. Te contactaremos usando el email o teléfono que dejaste.</p></div>
        <button type="button" onClick={() => setSent(false)}>Enviar otra</button>
      </div>}

      <form onSubmit={(event) => void submit(event)}>
        <label className="lead-field" htmlFor="lead-name"><span>Tu nombre</span><div className="lead-input-wrap"><UserRound size={17} /><input id="lead-name" required minLength={2} maxLength={120} autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="¿Cómo te llamás?" /></div></label>
        <label className="lead-field" htmlFor="lead-email"><span>Email <small>opcional</small></span><div className="lead-input-wrap"><Mail size={17} /><input id="lead-email" type="email" maxLength={320} autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="nombre@correo.com" /></div></label>
        <label className="lead-field" htmlFor="lead-phone"><span>Teléfono o WhatsApp <small>opcional</small></span><div className="lead-input-wrap"><WhatsAppIcon size={17} /><input id="lead-phone" type="tel" maxLength={80} autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Tu número de contacto" /></div></label>
        <p className={`lead-contact-hint ${hasContactMethod ? "is-ready" : ""}`}><ShieldCheck size={15} /> {hasContactMethod ? "Perfecto, ya tenemos dónde responderte." : "Dejanos un email o teléfono para que podamos responderte."}</p>

        {propertyId && <div className="lead-quick-questions"><span>Si te sirve, empezá por una de estas:</span><div>{quickQuestions.map((question) => <button type="button" key={question} onClick={() => addQuickQuestion(question)}>{question}</button>)}</div></div>}

        <label className="lead-field lead-message-field" htmlFor="lead-message"><span>{propertyId ? "¿Qué te gustaría consultar?" : "Contanos un poco más"}</span><textarea ref={messageRef} id="lead-message" required minLength={3} maxLength={4000} rows={4} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Escribí tu consulta acá…" /></label>
        <label className="lead-honeypot" aria-hidden="true">Sitio web<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
        <label className="lead-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Acepto que Riviera use mis datos únicamente para responder esta consulta.</span></label>
        {turnstileSiteKey ? <div className="lead-captcha"><TurnstileWidget key={captchaReset} siteKey={turnstileSiteKey} onToken={setCaptchaToken} /></div> : <small className="lead-captcha-warning">La verificación anti-spam requiere configuración antes de habilitar el envío.</small>}
        <button type="submit" className="button button-primary lead-submit-button" disabled={sending || !turnstileSiteKey || !captchaToken || !consent || !hasContactMethod}>
          {sending ? <LoaderCircle className="spin" size={17} /> : <ArrowRight size={17} />}
          {sending ? "Enviando tu consulta…" : "Enviar consulta"}
        </button>
      </form>
      <div className="lead-inquiry-footer"><span>Tu consulta es privada y solo la verá el equipo de Riviera.</span><a href={createWhatsAppUrl(whatsappMessage)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={16} /> ¿Preferís escribir por WhatsApp?</a></div>
    </section>
  );
}
