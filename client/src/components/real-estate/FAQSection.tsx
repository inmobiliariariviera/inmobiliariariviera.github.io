import { useEffect, useState } from "react";
import { ChevronDown, CircleHelp } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Faq = { id: string; question: string; answer: string; category: string };
const fallbackFaq: Faq[] = [
  { id: "fallback-1", question: "¿Cómo consulto por una propiedad?", answer: "Abrí la ficha de la propiedad y completá el formulario de consulta. También podés escribirnos por WhatsApp desde el botón de contacto.", category: "general" },
  { id: "fallback-2", question: "¿Trabajan con venta y alquiler?", answer: "Sí. Riviera gestiona propiedades en venta y alquiler en Traslasierra y zonas cercanas. Consultanos por la disponibilidad actual.", category: "operaciones" },
  { id: "fallback-3", question: "¿Puedo ofrecer mi propiedad?", answer: "Sí. Escribinos para conversar sobre la propiedad, su documentación, el precio y la estrategia de publicación.", category: "propietarios" },
];

export default function FAQSection() {
  const [items, setItems] = useState<Faq[]>(fallbackFaq);
  const [open, setOpen] = useState<string | null>(fallbackFaq[0].id);
  useEffect(() => {
    if (!supabase) return;
    supabase.from("faq_entries").select("id, question, answer, category").eq("is_active", true).order("created_at", { ascending: true }).limit(12).then(({ data }) => {
      if (data?.length) { setItems(data as Faq[]); setOpen(data[0].id); }
    });
  }, []);
  return <section className="faq-section" id="preguntas" aria-labelledby="faq-heading" data-scroll-reveal><div className="section-heading-row"><div><span className="eyebrow">RESPUESTAS RÁPIDAS</span><h2 id="faq-heading">Preguntas frecuentes.</h2></div><CircleHelp size={24} /></div><div className="faq-list">{items.map((item) => <article className={`faq-item ${open === item.id ? "is-open" : ""}`} key={item.id}><button type="button" onClick={() => setOpen(open === item.id ? null : item.id)} aria-expanded={open === item.id}><span>{item.question}</span><ChevronDown size={17} /></button>{open === item.id && <p>{item.answer}</p>}</article>)}</div></section>;
}
