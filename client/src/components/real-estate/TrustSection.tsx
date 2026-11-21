import { FileCheck2, MapPinned, MessageCircle, UserRoundCheck } from "lucide-react";

const servicePrinciples = [
  {
    icon: UserRoundCheck,
    title: "Atención personalizada",
    description: "Un trato cercano para conversar cada búsqueda y cada operación.",
  },
  {
    icon: MapPinned,
    title: "Conocimiento de Traslasierra",
    description: "Acompañamiento con mirada local sobre la zona y sus localidades.",
  },
  {
    icon: FileCheck2,
    title: "Acompañamiento documental",
    description: "Orientación durante la revisión de la documentación de cada propiedad.",
  },
  {
    icon: MessageCircle,
    title: "Contacto directo",
    description: "Podés escribirle al equipo de RIVIERA por WhatsApp.",
  },
];

export default function TrustSection() {
  return (
    <section className="trust-section" aria-labelledby="trust-heading" data-scroll-reveal>
      <div className="trust-intro">
        <span className="eyebrow">UNA ATENCIÓN CERCANA</span>
        <h2 id="trust-heading">Acompañamiento claro, de principio a fin.</h2>
        <p>Conocé cómo trabajamos antes de dar el próximo paso.</p>
      </div>
      <div className="trust-principles">
        {servicePrinciples.map(({ icon: Icon, title, description }) => (
          <article className="trust-principle" key={title}>
            <span className="trust-icon"><Icon size={19} aria-hidden="true" /></span>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
