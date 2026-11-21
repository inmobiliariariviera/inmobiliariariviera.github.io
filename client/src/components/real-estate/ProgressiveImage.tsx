import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  unavailableLabel?: string;
};

export default function ProgressiveImage({
  src,
  alt,
  className = "",
  loading = "lazy",
  fetchPriority = "auto",
  unavailableLabel = "Foto no disponible",
}: Props) {
  const [state, setState] = useState<"loading" | "loaded" | "failed">(src ? "loading" : "failed");

  useEffect(() => setState(src ? "loading" : "failed"), [src]);

  return (
    <span className={`progressive-image ${className} ${state === "loaded" ? "is-loaded" : ""}`} data-image-state={state}>
      {state === "loading" && <span className="progressive-image-placeholder" aria-hidden="true" />}
      {src && state !== "failed" && (
        <img
          className="progressive-image-element"
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          fetchPriority={fetchPriority}
          onLoad={() => setState("loaded")}
          onError={() => setState("failed")}
        />
      )}
      {state === "failed" && <span className="progressive-image-fallback" role="img" aria-label={unavailableLabel}><ImageOff size={23} aria-hidden="true" /><span>{unavailableLabel}</span></span>}
    </span>
  );
}
