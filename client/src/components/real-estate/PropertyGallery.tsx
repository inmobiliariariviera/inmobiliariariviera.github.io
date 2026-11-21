import { ChevronLeft, ChevronRight, Expand, ImageOff, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import ProgressiveImage from "@/components/real-estate/ProgressiveImage";

export default function PropertyGallery({ images, title }: { images: string[]; title: string }) {
  const safeImages = useMemo(() => images.map((image) => image.trim()).filter(Boolean), [images]);
  const imageKey = safeImages.join("\n");
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const mainTouchStartX = useRef<number | null>(null);
  const suppressMainClick = useRef(false);
  const count = safeImages.length;
  const activeImage = safeImages[activeIndex];

  useEffect(() => {
    setActiveIndex(0);
    setLightboxOpen(false);
  }, [imageKey]);

  const move = (direction: number) => {
    if (count < 2) return;
    setActiveIndex((current) => (current + direction + count) % count);
  };

  useEffect(() => {
    if (!lightboxOpen) return;
    const previousOverflow = document.body.style.overflow;
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowRight") move(1);
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "Tab") {
        const dialog = document.querySelector<HTMLElement>(".lightbox[role='dialog']");
        const focusable = dialog ? [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')] : [];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (triggerRef.current?.isConnected) triggerRef.current.focus();
    };
  }, [lightboxOpen, count]);

  const visibleThumbs = safeImages.slice(1, 3);
  const remainingCount = Math.max(0, count - 3);
  const openFromTrigger = (event: React.MouseEvent<HTMLButtonElement>, index?: number) => {
    triggerRef.current = event.currentTarget;
    if (typeof index === "number") setActiveIndex(index);
    setLightboxOpen(true);
  };
  const onMainTouchEnd = (event: React.TouchEvent<HTMLButtonElement>) => {
    const start = mainTouchStartX.current;
    mainTouchStartX.current = null;
    if (start === null || count < 2) return;
    const delta = event.changedTouches[0]?.clientX - start;
    if (typeof delta === "number" && Math.abs(delta) > 45) {
      move(delta < 0 ? 1 : -1);
      suppressMainClick.current = true;
      window.setTimeout(() => { suppressMainClick.current = false; }, 400);
    }
  };

  return (
    <>
      {count === 0 ? (
        <div className="property-gallery gallery-empty" role="status"><ImageOff size={30} /><strong>Fotos no disponibles</strong><span>Consultá con la inmobiliaria para recibir imágenes de esta propiedad.</span></div>
      ) : (
        <div className={`property-gallery ${count === 1 ? "gallery-single" : `gallery-count-${Math.min(count, 3)}`} `}>
          <button
            className="gallery-main"
            type="button"
            onClick={(event) => { if (suppressMainClick.current) { suppressMainClick.current = false; return; } openFromTrigger(event); }}
            onTouchStart={(event) => { mainTouchStartX.current = event.touches[0]?.clientX ?? null; }}
            onTouchEnd={onMainTouchEnd}
            aria-label={`Abrir galería de ${count} ${count === 1 ? "fotografía" : "fotografías"}`}
          >
            <ProgressiveImage className="gallery-progressive" src={activeImage} alt={`${title} — fotografía ${activeIndex + 1} de ${count}`} loading="eager" fetchPriority="high" unavailableLabel={`Fotografía ${activeIndex + 1} no disponible`} />
            <span className="gallery-expand"><Expand size={16} /> Ver fotos</span>
            <span className="gallery-count" aria-live="polite" aria-atomic="true">{activeIndex + 1} / {count}</span>
          </button>
          {count > 1 && <div className="gallery-touch-controls" aria-label="Navegación de fotografías">
            <button type="button" onClick={() => move(-1)} aria-label="Fotografía anterior"><ChevronLeft size={19} /></button>
            <span aria-live="polite">{activeIndex + 1} de {count}</span>
            <button type="button" onClick={() => move(1)} aria-label="Fotografía siguiente"><ChevronRight size={19} /></button>
          </div>}
          {visibleThumbs.length > 0 && <div className="gallery-thumbs" aria-label="Otras fotografías">
            {visibleThumbs.map((image, thumbOffset) => {
              const index = thumbOffset + 1;
              const showMore = thumbOffset === visibleThumbs.length - 1 && remainingCount > 0;
              return <button className={`gallery-thumb ${index === activeIndex ? "is-active" : ""}`} type="button" key={`${image}-${index}`} onClick={(event) => openFromTrigger(event, index)} aria-label={`${showMore ? `Ver fotografía ${index + 1} y ${remainingCount} más` : `Abrir fotografía ${index + 1}`}`} aria-pressed={index === activeIndex}>
                <ProgressiveImage className="gallery-thumb-progressive" src={image} alt="" unavailableLabel={`Fotografía ${index + 1} no disponible`} />
                {showMore && <span className="thumb-overlay">+{remainingCount}</span>}
              </button>;
            })}
          </div>}
        </div>
      )}

      {lightboxOpen && count > 0 && createPortal(
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={`Galería de ${title}`} onClick={() => setLightboxOpen(false)} onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)} onTouchEnd={(event) => {
          if (touchStartX === null || count < 2) return;
          const delta = event.changedTouches[0]?.clientX - touchStartX;
          if (typeof delta === "number" && Math.abs(delta) > 45) move(delta < 0 ? 1 : -1);
          setTouchStartX(null);
        }}>
          <button ref={closeButtonRef} className="lightbox-close" type="button" aria-label="Cerrar galería" title="Cerrar" onClick={(event) => { event.stopPropagation(); setLightboxOpen(false); }}><X size={24} /></button>
          {count > 1 && <button className="lightbox-arrow lightbox-prev" type="button" aria-label="Fotografía anterior" onClick={(event) => { event.stopPropagation(); move(-1); }}><ChevronLeft size={28} /></button>}
          <div className="lightbox-image-wrap" onClick={(event) => event.stopPropagation()}><ProgressiveImage className="lightbox-progressive" src={activeImage} alt={`${title} — fotografía ${activeIndex + 1} de ${count}`} loading="eager" fetchPriority="high" unavailableLabel="Esta fotografía no está disponible." /></div>
          {count > 1 && <button className="lightbox-arrow lightbox-next" type="button" aria-label="Fotografía siguiente" onClick={(event) => { event.stopPropagation(); move(1); }}><ChevronRight size={28} /></button>}
          <span className="lightbox-caption">{title} · {activeIndex + 1} de {count}</span>
        </div>,
        document.body
      )}
    </>
  );
}
