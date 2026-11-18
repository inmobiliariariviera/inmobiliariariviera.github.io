import { ChevronLeft, ChevronRight, Expand, ImageOff, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";

export default function PropertyGallery({ images, title }: { images: string[]; title: string }) {
  const safeImages = useMemo(() => images.map((image) => image.trim()).filter(Boolean), [images]);
  const imageKey = safeImages.join("\n");
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const count = safeImages.length;
  const activeImage = safeImages[activeIndex];

  useEffect(() => {
    setActiveIndex(0);
    setLightboxOpen(false);
    setFailedImages(new Set());
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

  const markImageFailed = (src: string) => setFailedImages((current) => new Set(current).add(src));
  const failed = (src: string | undefined) => !src || failedImages.has(src);
  const visibleThumbs = safeImages.slice(1, 3);
  const remainingCount = Math.max(0, count - 3);
  const openFromTrigger = (event: React.MouseEvent<HTMLButtonElement>, index?: number) => {
    triggerRef.current = event.currentTarget;
    if (typeof index === "number") setActiveIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      {count === 0 ? (
        <div className="property-gallery gallery-empty" role="status"><ImageOff size={30} /><strong>Fotos no disponibles</strong><span>Consultá con la inmobiliaria para recibir imágenes de esta propiedad.</span></div>
      ) : (
        <div className={`property-gallery ${count === 1 ? "gallery-single" : `gallery-count-${Math.min(count, 3)}`} `}>
          <button className={`gallery-main ${failed(activeImage) ? "image-unavailable" : ""}`} type="button" onClick={(event) => openFromTrigger(event)} aria-label="Abrir galería de fotos">
            {failed(activeImage) ? <span className="gallery-image-fallback"><ImageOff size={28} /><span>Foto no disponible</span></span> : <img src={activeImage} alt={`${title} — fotografía ${activeIndex + 1}`} decoding="async" onError={() => markImageFailed(activeImage)} />}
            <span className="gallery-expand"><Expand size={16} /> Ver fotos</span>
            <span className="gallery-count">{activeIndex + 1} / {count}</span>
          </button>
          {visibleThumbs.length > 0 && <div className="gallery-thumbs" aria-label="Otras fotografías">
            {visibleThumbs.map((image, thumbOffset) => {
              const index = thumbOffset + 1;
              const showMore = thumbOffset === visibleThumbs.length - 1 && remainingCount > 0;
              return <button className={`gallery-thumb ${index === activeIndex ? "is-active" : ""} ${failed(image) ? "image-unavailable" : ""}`} type="button" key={`${image}-${index}`} onClick={(event) => openFromTrigger(event, index)} aria-label={`${showMore ? `Ver fotografía ${index + 1} y ${remainingCount} más` : `Abrir fotografía ${index + 1}`}`} aria-pressed={index === activeIndex}>
                {failed(image) ? <ImageOff size={18} /> : <img src={image} alt="" decoding="async" onError={() => markImageFailed(image)} />}
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
          {failed(activeImage) ? <div className="lightbox-fallback" onClick={(event) => event.stopPropagation()}><ImageOff size={38} /><span>Esta fotografía no está disponible.</span></div> : <img className="lightbox-image" src={activeImage} alt={`${title} — fotografía ${activeIndex + 1}`} decoding="async" draggable={false} onError={() => markImageFailed(activeImage)} onClick={(event) => event.stopPropagation()} />}
          {count > 1 && <button className="lightbox-arrow lightbox-next" type="button" aria-label="Fotografía siguiente" onClick={(event) => { event.stopPropagation(); move(1); }}><ChevronRight size={28} /></button>}
          <span className="lightbox-caption">{title} · {activeIndex + 1} de {count}</span>
        </div>,
        document.body
      )}
    </>
  );
}
