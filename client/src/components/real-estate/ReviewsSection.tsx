import { useEffect, useState, type FormEvent } from "react";
import { ExternalLink, MessageCircle, Star } from "lucide-react";
import { toast } from "sonner";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

// Reemplazar por el enlace "Pedir reseñas" de tu Perfil de Empresa de Google.
export const GOOGLE_REVIEW_URL = "https://www.google.com/maps/search/?api=1&query=Inmobiliaria%20Riviera%20Traslasierra";

type Review = { id: string; author_name: string; rating: number; comment: string; created_at: string };

export default function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ author_name: "", rating: 5, comment: "" });

  const loadReviews = async () => {
    if (!supabase) { setLoading(false); return; }
    const { data, error } = await supabase.from("reviews").select("id, author_name, rating, comment, created_at").eq("is_approved", true).order("created_at", { ascending: false }).limit(12);
    if (!error) setReviews((data ?? []) as Review[]);
    setLoading(false);
  };

  useEffect(() => { void loadReviews(); }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) { toast.error("Las reseñas estarán disponibles cuando se conecte Supabase."); return; }
    setSaving(true);
    const { error } = await supabase.from("reviews").insert({ author_name: form.author_name.trim(), rating: form.rating, comment: form.comment.trim() });
    setSaving(false);
    if (error) { toast.error("No pudimos enviar la reseña. Intentá nuevamente."); return; }
    setForm({ author_name: "", rating: 5, comment: "" });
    toast.success("Gracias. Tu reseña quedó pendiente de aprobación.");
  };

  return (
    <section className="reviews-section" id="resenas" aria-labelledby="resenas-heading" data-scroll-reveal>
      <div className="reviews-heading"><div><span className="eyebrow">EXPERIENCIAS RIVIERA</span><h2 id="resenas-heading">Tu opinión nos ayuda a crecer.</h2><p>Compartí cómo fue tu experiencia con nuestro equipo. También podés dejarnos una reseña pública en Google.</p></div><a className="button button-primary reviews-google-button" href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer"><Star size={16} /> Dejar reseña en Google <ExternalLink size={14} /></a></div>
      <div className="reviews-layout">
        <div className="reviews-list" aria-live="polite">{loading ? <p className="reviews-empty">Cargando reseñas…</p> : reviews.length ? reviews.map((review) => <article className="review-card" key={review.id}><div className="review-card-top"><strong>{review.author_name}</strong><span className="review-stars" aria-label={`${review.rating} de 5 estrellas`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={14} fill={index < review.rating ? "currentColor" : "none"} />)}</span></div><p>{review.comment}</p></article>) : <div className="reviews-empty"><MessageCircle size={21} /><p>Tu experiencia puede ser la primera en aparecer acá.</p></div>}</div>
        <form className="review-form" onSubmit={submit}><div className="review-form-heading"><strong>Contanos tu experiencia</strong><small>La reseña se publica después de una breve revisión.</small></div><label>Nombre<input required minLength={2} maxLength={100} value={form.author_name} onChange={(event) => setForm({ ...form, author_name: event.target.value })} placeholder="Tu nombre" /></label><label>Calificación<select value={form.rating} onChange={(event) => setForm({ ...form, rating: Number(event.target.value) })}><option value={5}>★★★★★ Excelente</option><option value={4}>★★★★ Muy buena</option><option value={3}>★★★ Buena</option><option value={2}>★★ Regular</option><option value={1}>★ A mejorar</option></select></label><label>Comentario<textarea required minLength={10} maxLength={1200} rows={4} value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} placeholder="¿Cómo fue tu experiencia con Riviera?" /></label><button className="button button-secondary" type="submit" disabled={saving}>{saving ? "Enviando…" : "Enviar reseña"}</button></form>
      </div>
    </section>
  );
}
