import { Facebook, Instagram, Mail, Youtube } from "lucide-react";
import { Link } from "wouter";
import { BUSINESS_EMAIL } from "@/lib/contact";
import { createFacebookShareUrl, INSTAGRAM_PROFILE_URL, YOUTUBE_CHANNEL_URL } from "@/lib/social";

export default function SiteFooter() {
  return (
    <footer className="site-footer" data-scroll-reveal>
      <div className="footer-bottom footer-bottom-minimal">
        <Link href="/" className="footer-brand-lockup footer-minimal-brand" aria-label="RIVIERA — inicio">
          <span className="footer-logo-mark"><img src={`${import.meta.env.BASE_URL}riviera-brand-mark.png`} alt="Isotipo de montaña de RIVIERA" /></span>
          <span className="footer-brand"><strong>RIVIERA</strong></span>
        </Link>
        <a className="footer-email-link" href={`mailto:${BUSINESS_EMAIL}`} aria-label={`Enviar correo a ${BUSINESS_EMAIL}`}>
          <Mail size={15} aria-hidden="true" />
          <span>Gmail: {BUSINESS_EMAIL}</span>
        </a>
        <nav className="footer-section-links" aria-label="Apartados públicos">
          <a href="/?seccion=propiedades">Propiedades</a>
          <a href="/?seccion=confianza">Cómo trabajamos</a>
          <a href="/?seccion=preguntas">Preguntas</a>
          <a href="/?seccion=resenas">Reseñas</a>
          <a href="/?seccion=contacto">Contacto</a>
        </nav>
        <nav className="footer-social-icons" aria-label="Redes sociales de RIVIERA">
          <a className="footer-social-icon" href={INSTAGRAM_PROFILE_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram de RIVIERA" title="Instagram">
            <Instagram size={16} aria-hidden="true" />
          </a>
          <a className="footer-social-icon" href={YOUTUBE_CHANNEL_URL} target="_blank" rel="noopener noreferrer" aria-label="Canal de YouTube de RIVIERA" title="YouTube">
            <Youtube size={16} aria-hidden="true" />
          </a>
          <a className="footer-social-icon" href={createFacebookShareUrl()} target="_blank" rel="noopener noreferrer" aria-label="Compartir RIVIERA en Facebook" title="Facebook">
            <Facebook size={16} aria-hidden="true" />
          </a>
        </nav>
        <span className="footer-copyright" data-text="© 2026 RIVIERA">© 2026 RIVIERA</span>
      </div>
    </footer>
  );
}
