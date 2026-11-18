import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, Check, CheckCircle2, Circle, Eye, FileText, Link2, MapPin, Trash2, UploadCloud } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { getYouTubeVideoId } from "@/lib/youtube";
import SiteHeader from "@/components/real-estate/SiteHeader";
import SiteFooter from "@/components/real-estate/SiteFooter";

type Draft = {
  operation: "Venta" | "Alquiler";
  category: "Campo" | "Casa" | "Terreno";
  title: string;
  price: string;
  currency: "USD" | "ARS";
  surface: string;
  surfaceUnit: "ha" | "m²";
  description: string;
  locality: string;
  province: string;
  zone: string;
  videoUrl: string;
};
type LocalPhoto = { id: string; name: string; url: string };
type StepState = "complete" | "current" | "pending";

const DRAFT_KEY = "portal-inmobiliario-demo-draft-v1";
const initialDraft: Draft = {
  operation: "Venta",
  category: "Campo",
  title: "",
  price: "",
  currency: "USD",
  surface: "",
  surfaceUnit: "ha",
  description: "",
  locality: "",
  province: "",
  zone: "",
  videoUrl: "",
};
const stepNames = ["Datos básicos", "Ubicación", "Fotos y video"];

function StatusIcon({ complete, current }: { complete: boolean; current: boolean }) {
  if (complete) return <CheckCircle2 size={21} />;
  if (current) return <Circle size={21} />;
  return <Circle size={21} />;
}

export default function Publish() {
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      return saved ? { ...initialDraft, ...JSON.parse(saved) as Partial<Draft> } : initialDraft;
    } catch {
      return initialDraft;
    }
  });
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [previewReady, setPreviewReady] = useState(false);
  const photoUrls = useRef<string[]>([]);
  const videoId = getYouTubeVideoId(draft.videoUrl);

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* storage can be disabled */ }
  }, [draft]);
  useEffect(() => () => photoUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const basicComplete = Boolean(draft.title.trim() && Number(draft.price) > 0 && draft.description.trim() && Number(draft.surface) > 0);
  const locationComplete = Boolean(draft.locality.trim() && draft.province.trim());
  const photoComplete = photos.length > 0 && (!draft.videoUrl.trim() || Boolean(videoId));
  const completion = [basicComplete, locationComplete, photoComplete];
  const allComplete = completion.every(Boolean);
  const progress = Math.round((completion.filter(Boolean).length / completion.length) * 100);

  const stepState = (index: number): StepState => completion[index] ? "complete" : index === step ? "current" : "pending";
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setPreviewReady(false);
  };

  const addPhotos = (files: FileList | null) => {
    if (!files?.length) return;
    const available = Math.max(0, 10 - photos.length);
    const selected = Array.from(files).filter((file) => file.type.startsWith("image/")).slice(0, available);
    const newPhotos = selected.map((file) => {
      const url = URL.createObjectURL(file);
      photoUrls.current.push(url);
      return { id: `${file.name}-${file.lastModified}-${Math.random()}`, name: file.name, url };
    });
    setPhotos((current) => [...current, ...newPhotos]);
    if (selected.length < files.length) toast.info("Podés previsualizar hasta 10 imágenes en esta demostración.");
    setPreviewReady(false);
  };

  const removePhoto = (id: string) => {
    const target = photos.find((photo) => photo.id === id);
    if (target) {
      URL.revokeObjectURL(target.url);
      photoUrls.current = photoUrls.current.filter((url) => url !== target.url);
    }
    setPhotos((current) => current.filter((photo) => photo.id !== id));
    setPreviewReady(false);
  };

  const saveDraft = () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      toast.success("Borrador guardado en este dispositivo");
    } catch {
      toast.error("El navegador no permitió guardar el borrador.");
    }
  };

  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* storage can be disabled */ }
    photos.forEach((photo) => URL.revokeObjectURL(photo.url));
    photoUrls.current = [];
    setPhotos([]);
    setDraft(initialDraft);
    setStep(0);
    setPreviewReady(false);
    toast.success("Borrador de demostración reiniciado");
  };

  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="publish-page">
        <Link href="/" className="back-link"><ArrowLeft size={15} /> Volver al catálogo</Link>
        <div className="publish-heading" data-scroll-reveal>
          <span className="eyebrow">PUBLICAR UNA PROPIEDAD</span>
          <h1>Armá tu aviso paso a paso.</h1>
          <p>Completá los datos, ubicá la propiedad y sumá fotos y video. Esta versión prepara una vista previa local; todavía no publica anuncios reales.</p>
        </div>

        <div className="publish-progress-top" data-scroll-reveal>
          <div className="publish-progress-caption"><strong>Estado de carga en portal</strong><span>{progress}% completo</span></div>
          <div className="publish-progress-track"><span style={{ width: `${progress}%` }} /></div>
          <div className="publish-step-status">
            {stepNames.map((name, index) => {
              const status = stepState(index);
              return (
                <button key={name} className={`publish-step-card is-${status}`} type="button" onClick={() => setStep(index)} aria-current={step === index ? "step" : undefined}>
                  <span className="publish-step-icon"><StatusIcon complete={status === "complete"} current={status === "current"} /></span>
                  <span className="publish-step-copy"><strong>Paso {index + 1} · {name}</strong><small>{index === 0 ? basicComplete ? "Título, precio y descripción completos" : "Completá título, precio, superficie y descripción" : index === 1 ? locationComplete ? `${draft.locality}, ${draft.province}` : "Indicá localidad y provincia" : photos.length ? `${photos.length} foto${photos.length === 1 ? "" : "s"}${draft.videoUrl ? " · link de video" : " · video opcional"}` : "Agregá fotos y, si querés, un video"}</small></span>
                  <span className="publish-step-arrow"><ArrowRight size={15} /></span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="publish-layout publish-editor-layout" data-scroll-reveal>
          <section className="publish-form-card">
            <div className="publish-form-header">
              <div><span className="eyebrow">PASO {step + 1} DE 3</span><h2>{stepNames[step]}</h2></div>
              <span className="step-counter">{step + 1}<i>/</i>3</span>
            </div>
            <div className="publish-step-tabs" role="tablist" aria-label="Pasos de publicación">
              {stepNames.map((name, index) => <button role="tab" aria-selected={step === index} className={step === index ? "is-active" : ""} key={name} type="button" onClick={() => setStep(index)}>{index + 1}. {name}</button>)}
            </div>

            {step === 0 && <div className="publish-form-grid">
              <label className="publish-field publish-field-wide">Título del aviso<input value={draft.title} onChange={(event) => update("title", event.target.value)} placeholder="Ej. Campo de 3 hectáreas con arroyo" /></label>
              <label className="publish-field">Operación<select value={draft.operation} onChange={(event) => update("operation", event.target.value as Draft["operation"])}><option>Venta</option><option>Alquiler</option></select></label>
              <label className="publish-field">Tipo de propiedad<select value={draft.category} onChange={(event) => update("category", event.target.value as Draft["category"])}><option>Campo</option><option>Casa</option><option>Terreno</option></select></label>
              <label className="publish-field">Precio<input type="number" min="0" value={draft.price} onChange={(event) => update("price", event.target.value)} placeholder="96000" /></label>
              <label className="publish-field">Moneda<select value={draft.currency} onChange={(event) => update("currency", event.target.value as Draft["currency"])}><option>USD</option><option>ARS</option></select></label>
              <label className="publish-field">Superficie<input type="number" min="0" value={draft.surface} onChange={(event) => update("surface", event.target.value)} placeholder="3" /></label>
              <label className="publish-field">Unidad<select value={draft.surfaceUnit} onChange={(event) => update("surfaceUnit", event.target.value as Draft["surfaceUnit"])}><option value="ha">Hectáreas</option><option value="m²">m²</option></select></label>
              <label className="publish-field publish-field-wide">Descripción<textarea value={draft.description} onChange={(event) => update("description", event.target.value)} rows={4} placeholder="Describí la propiedad, sus características y servicios." /></label>
              <p className="publish-inline-help publish-field-wide"><FileText size={14} /> Los campos son parte de un borrador local de demostración.</p>
            </div>}

            {step === 1 && <div className="publish-form-grid">
              <label className="publish-field">Provincia<input value={draft.province} onChange={(event) => update("province", event.target.value)} placeholder="Ej. Córdoba" /></label>
              <label className="publish-field">Localidad<input value={draft.locality} onChange={(event) => update("locality", event.target.value)} placeholder="Ej. San Javier" /></label>
              <label className="publish-field publish-field-wide">Zona, barrio o referencia<input value={draft.zone} onChange={(event) => update("zone", event.target.value)} placeholder="Ej. Loma Bola, Valle de Traslasierra" /></label>
              <div className="location-preview publish-field-wide"><MapPin size={18} /><span>{draft.locality || "Localidad"}{draft.province ? `, ${draft.province}` : ""}{draft.zone ? ` · ${draft.zone}` : ""}</span><small>Vista previa de ubicación; no se consulta un mapa en esta demostración.</small></div>
            </div>}

            {step === 2 && <div className="publish-media-step">
              <div className="upload-dropzone"><span className="upload-icon"><UploadCloud size={22} /></span><strong>Sumá fotos de la propiedad</strong><small>Elegí hasta 10 imágenes para una vista previa en este dispositivo.</small><label className="button button-secondary upload-button"><Camera size={16} /> Elegir fotografías<input type="file" accept="image/*" multiple onChange={(event) => { addPhotos(event.target.files); event.target.value = ""; }} /></label><span className="upload-local-note">Las fotos no se suben a ningún servidor.</span></div>
              {photos.length > 0 && <div className="photo-preview-grid">{photos.map((photo) => <div className="photo-preview-item" key={photo.id}><img src={photo.url} alt={`Vista previa de ${photo.name}`} /><button type="button" aria-label={`Quitar ${photo.name}`} onClick={() => removePhoto(photo.id)}><Trash2 size={14} /></button><small>{photo.name}</small></div>)}</div>}
              <label className="publish-field video-url-field">Link de video de YouTube <span>Opcional</span><div className="video-input-wrap"><Link2 size={16} /><input type="url" value={draft.videoUrl} onChange={(event) => update("videoUrl", event.target.value)} placeholder="https://youtu.be/..." /></div>{draft.videoUrl.trim() && !videoId && <small className="field-error">Ingresá un link HTTPS válido de un video de YouTube.</small>}</label>
              {videoId && <div className="video-preview"><iframe title={`Vista previa del video: ${draft.title || "propiedad"}`} src={`https://www.youtube-nocookie.com/embed/${videoId}`} loading="lazy" referrerPolicy="no-referrer" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /><p className="video-preview-note">Vista previa cargada desde YouTube. El video no se sube ni se guarda en este portal.</p></div>}
            </div>}

            <div className="publish-form-actions">
              <button className="button button-secondary" type="button" onClick={() => step > 0 ? setStep(step - 1) : clearDraft()}>{step > 0 ? <><ArrowLeft size={15} /> Anterior</> : <><Trash2 size={14} /> Limpiar borrador</>}</button>
              <div className="publish-action-right"><button className="button button-secondary" type="button" onClick={saveDraft}>Guardar borrador</button>{step < 2 ? <button className="button button-primary" type="button" onClick={() => setStep(step + 1)}>Continuar <ArrowRight size={15} /></button> : <button className="button button-primary" type="button" disabled={!allComplete} onClick={() => { setPreviewReady(true); toast.success("Vista previa lista en este navegador"); }}><Eye size={15} /> Vista previa</button>}</div>
            </div>
            {previewReady && <div className="publish-local-preview" role="status"><span className="publish-preview-check"><Check size={17} /></span><div><strong>Vista previa de demostración preparada</strong><small>{draft.title} · {draft.locality}, {draft.province} · {photos.length} foto{photos.length === 1 ? "" : "s"}</small><p>No se publicó ni se envió el aviso. El borrador se conserva solo en este navegador.</p></div></div>}
          </section>

          <aside className="publish-side-card"><span className="publish-number">{String(step + 1).padStart(2, "0")}</span><h2>Antes de publicar.</h2><p>Revisá que el título, la ubicación, el precio, la documentación y las fotos correspondan a una propiedad real.</p><div className="publish-side-divider" /><span className="publish-side-caption">BORRADOR LOCAL</span><strong>{progress}% de los pasos completados</strong><div className="side-progress-track"><span style={{ width: `${progress}%` }} /></div><div className="publish-side-callout"><strong>Esta versión no publica avisos.</strong><span>Datos y borrador quedan en este navegador. Las fotos seleccionadas no se guardan ni se suben.</span></div><Link href="/" className="publish-cta">Volver a explorar <ArrowRight size={16} /></Link></aside>
        </div>
        <div className="publish-footer-note" data-scroll-reveal><span>PUBLICACIÓN DE DEMOSTRACIÓN</span><p>Para activar avisos reales se necesita configurar la marca, los datos de contacto y el almacenamiento seguro de fotos. Las estimaciones de costos también deben validarse para cada operación.</p></div>
      </main>
      <SiteFooter />
    </div>
  );
}
