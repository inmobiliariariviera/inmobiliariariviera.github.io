import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);

    try {
      const savedTheme = window.localStorage.getItem("riviera-theme") ?? window.localStorage.getItem("champaqui-theme");
      document.documentElement.dataset.theme = savedTheme === "dark" ? "dark" : "light";
    } catch { /* local storage may be unavailable */ }

    return () => robots.remove();
  }, []);

  return (
    <main className="not-found-page" aria-live="polite">
      <section className="not-found-card" aria-labelledby="not-found-title">
        <div className="not-found-brand" aria-label="RIVIERA Inmobiliaria">
          <img
            className="not-found-logo"
            src={`${import.meta.env.BASE_URL}riviera-brand-mark.png`}
            alt=""
            aria-hidden="true"
          />
          <span className="not-found-wordmark">
            <span>RIVIERA</span>
            <small>INMOBILIARIA</small>
          </span>
        </div>
        <div className="not-found-rule" aria-hidden="true" />
        <p className="not-found-code">ERROR 404</p>
        <h1 id="not-found-title" className="not-found-title">No encontramos esta página</h1>
        <p className="not-found-description">
          La dirección puede haber cambiado o no estar disponible. Volvé al inicio para seguir explorando.
        </p>
        <button className="not-found-button" onClick={() => setLocation("/")}>
          <span>Volver al inicio</span>
          <ArrowLeft size={15} strokeWidth={1.7} aria-hidden="true" />
        </button>
      </section>
    </main>
  );
}
