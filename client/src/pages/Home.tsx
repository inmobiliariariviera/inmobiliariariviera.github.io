import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Facebook, Instagram, MapPin, Search, SlidersHorizontal, Star, Youtube } from "lucide-react";
import SiteHeader from "@/components/real-estate/SiteHeader";
import SiteFooter from "@/components/real-estate/SiteFooter";
import PropertyCard from "@/components/real-estate/PropertyCard";
import { Link } from "wouter";
import { usePublicProperties } from "@/lib/usePublicProperties";
import { normalizePropertyCategory } from "@/lib/propertyCategories";
import { LOCATION_SCOPE_LABELS, normalizeLocationScope, propertyMatchesLocationScope, type LocationScope } from "@/lib/locationScopes";
import { BUSINESS_PHONE_DISPLAY, createWhatsAppUrl } from "@/lib/contact";
import { createFacebookShareUrl, INSTAGRAM_PROFILE_URL, YOUTUBE_CHANNEL_URL } from "@/lib/social";
import WhatsAppIcon from "@/components/real-estate/WhatsAppIcon";
import { supabase } from "@/lib/supabase";

type PublicReview = { id: string; author_name: string; comment: string; rating: number | null };

export default function Home() {
  const query = new URLSearchParams(window.location.hash.split("?")[1] ?? window.location.search.slice(1));
  const initialOperation = query.get("operacion") === "alquiler" ? "Alquiler" : query.get("operacion") === "venta" ? "Venta" : "Todas";
  const initialSearchText = query.get("busqueda") ?? "";
  const initialCategory = normalizePropertyCategory(query.get("categoria"));
  const initialLocationScope = normalizeLocationScope(query.get("zona"));
  const [operation, setOperation] = useState(initialOperation);
  const [searchText, setSearchText] = useState(initialSearchText);
  const [category, setCategory] = useState(initialCategory);
  const [locationScope, setLocationScope] = useState<LocationScope>(initialLocationScope);
  const [showFilters, setShowFilters] = useState(false);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const { properties, loading, error } = usePublicProperties();
  const scrollToListings = () => document.getElementById("propiedades")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });

  useEffect(() => {
    let target: string | null = null;
    try {
      if (sessionStorage.getItem("portal-scroll-to-contact") === "1") { target = "contacto"; sessionStorage.removeItem("portal-scroll-to-contact"); }
      if (sessionStorage.getItem("portal-scroll-to-reviews") === "1") { target = "resenas"; sessionStorage.removeItem("portal-scroll-to-reviews"); }
    } catch { /* storage can be disabled */ }
    if (target) window.setTimeout(() => document.getElementById(target)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }), 80);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.from("reviews").select("id, author_name, comment, rating").eq("is_approved", true).order("created_at", { ascending: false }).limit(6).then(({ data }) => {
      if (data) setReviews(data as PublicReview[]);
    });
  }, []);

  useEffect(() => {
    const syncFiltersFromHash = () => {
      const params = new URLSearchParams(window.location.hash.split("?")[1] ?? window.location.search.slice(1));
      setSearchText(params.get("busqueda") ?? "");
      const routeOperation = params.get("operacion");
      setOperation(routeOperation === "alquiler" ? "Alquiler" : routeOperation === "venta" ? "Venta" : "Todas");
      setCategory(normalizePropertyCategory(params.get("categoria")));
      setLocationScope(normalizeLocationScope(params.get("zona")));
    };
    window.addEventListener("hashchange", syncFiltersFromHash);
    return () => window.removeEventListener("hashchange", syncFiltersFromHash);
  }, []);

  const filteredProperties = useMemo(() => properties.filter((property) => {
    const matchesOperation = operation === "Todas" || property.operation === operation;
    const matchesCategory = category === "Todas" || property.category === category;
    const haystack = `${property.title} ${property.location} ${property.region} ${property.category} ${property.features.join(" ")}`.toLocaleLowerCase("es-AR");
    const matchesText = haystack.includes(searchText.trim().toLocaleLowerCase("es-AR"));
    const matchesLocation = propertyMatchesLocationScope(property, locationScope);
    return matchesOperation && matchesCategory && matchesText && matchesLocation;
  }), [category, locationScope, operation, searchText]);

  const locationCaption = LOCATION_SCOPE_LABELS[locationScope];

  return (
    <div className="app-shell">
      <SiteHeader />
      <main>
        <section className="home-hero" data-scroll-reveal>
          <div className="hero-content">
            <span className="eyebrow hero-eyebrow"><span className="eyebrow-dot" /> PROPIEDADES EN TRASLASIERRA</span>
            <h1>Un lugar propio.<br /><em>Una nueva historia.</em></h1>
            <p>Explorá campos, casas y terrenos con información clara para dar el próximo paso.</p>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <img src={`${import.meta.env.BASE_URL}property-images/vista-rural.jpg`} alt="" />
            <div className="hero-visual-label"><strong>El paisaje también es parte de tu hogar.</strong></div>
          </div>
        </section>

        <section className="search-panel search-panel-location-only" aria-label="Buscar propiedades por ubicación" data-scroll-reveal>
          <div className="search-field location-search">
            <label htmlFor="location-search">Ubicación</label>
            <div className="input-with-icon"><MapPin size={17} /><select id="location-search" value={locationScope} onChange={(event) => setLocationScope(normalizeLocationScope(event.target.value))} aria-label="Seleccionar una zona permitida"><option value="all">Todas las zonas permitidas</option><option value="traslasierra">Traslasierra · Córdoba</option></select></div>
          </div>
          <button className="search-submit" type="button" onClick={scrollToListings} aria-label="Ver resultados"><Search size={18} /><span>Buscar</span></button>
        </section>

        <section className="listing-section" id="propiedades" data-scroll-reveal>
          <div className="section-heading-row">
            <div>
              <span className="eyebrow">SELECCIÓN DE PROPIEDADES</span>
              <h2>Encontrá tu próximo lugar.</h2>
            </div>
            <button className="filter-toggle" type="button" onClick={() => setShowFilters((show) => !show)} aria-expanded={showFilters}><SlidersHorizontal size={16} /> Filtros <span>{filteredProperties.length}</span></button>
          </div>
          {(showFilters || operation !== "Todas" || category !== "Todas" || locationScope !== "all") && <div className="active-filter-row"><button type="button" className={operation === "Todas" ? "filter-chip active" : "filter-chip"} onClick={() => setOperation("Todas")}>Todas</button><button type="button" className={operation === "Venta" ? "filter-chip active" : "filter-chip"} onClick={() => setOperation("Venta")}>Venta</button><button type="button" className={operation === "Alquiler" ? "filter-chip active" : "filter-chip"} onClick={() => setOperation("Alquiler")}>Alquiler</button>{category !== "Todas" && <span className="filter-chip active">Tipo · {category}</span>}{locationScope !== "all" && <button type="button" className="filter-chip active" onClick={() => setLocationScope("all")}>Zona · {LOCATION_SCOPE_LABELS[locationScope]}</button>}<span className="filter-note">Elegí operación, zona o tipo para refinar los resultados.</span></div>}
          <div className="result-caption"><span>{loading ? "Cargando propiedades…" : `${filteredProperties.length} ${filteredProperties.length === 1 ? "propiedad" : "propiedades"} para explorar`}</span><span>{locationCaption} <ArrowRight size={14} /></span></div>
          {error ? <div className="empty-state"><span className="empty-state-icon"><Search size={23} /></span><h3>No pudimos cargar las publicaciones.</h3><p>Revisá la conexión del sitio con Supabase e intentá nuevamente.</p><Link href="/admin" className="button button-secondary">Acceso de administración</Link></div> : loading ? <div className="empty-state"><p>Conectando con el catálogo…</p></div> : filteredProperties.length ? (
            <div className="property-grid">{filteredProperties.map((property) => <PropertyCard key={property.id ?? property.slug} property={property} />)}</div>
          ) : (
            <div className="empty-state"><span className="empty-state-icon"><Search size={23} /></span><h3>No encontramos propiedades con esos criterios.</h3><p>Probá con otra búsqueda o limpiá los filtros para explorar Traslasierra.</p><button className="button button-secondary" type="button" onClick={() => { setSearchText(""); setOperation("Todas"); setCategory("Todas"); setLocationScope("all"); }}>Ver toda la selección</button></div>
          )}
        </section>

        <section id="resenas" className="reviews-section" aria-labelledby="resenas-heading" data-scroll-reveal>
          <div className="section-heading-row"><div><span className="eyebrow">RESEÑAS</span><h2 id="resenas-heading">La confianza también se construye conversando.</h2><p className="section-intro">Compartimos las experiencias que nuestros clientes autorizan para que puedas conocernos antes de dar el próximo paso.</p></div><Star className="section-heading-mark" size={28} /></div>
          {reviews.length ? <div className="reviews-grid">{reviews.map((review) => <article className="review-card" key={review.id}><div className="review-stars" aria-label={`${review.rating ?? 5} de 5 estrellas`}>{Array.from({ length: review.rating ?? 5 }, (_, index) => <Star key={index} size={14} fill="currentColor" />)}</div><blockquote>“{review.comment}”</blockquote><footer><strong>{review.author_name}</strong><span>Cliente RIVIERA</span></footer></article>)}</div> : <div className="reviews-empty"><div className="review-stars"><Star size={15} fill="currentColor" /><Star size={15} fill="currentColor" /><Star size={15} fill="currentColor" /><Star size={15} fill="currentColor" /><Star size={15} fill="currentColor" /></div><h3>Estamos reuniendo nuevas historias.</h3><p>Muy pronto vas a encontrar aquí las reseñas de quienes confiaron en RIVIERA para buscar, vender o alquilar en Traslasierra.</p><a className="button button-secondary" href={createWhatsAppUrl("Hola, quiero conocer más sobre la atención de RIVIERA.")} target="_blank" rel="noopener noreferrer">Conversar con el equipo <ArrowRight size={16} /></a></div>}
        </section>

        <section id="preguntas" className="faq-section" aria-labelledby="faq-heading" data-scroll-reveal>
          <div className="faq-intro"><span className="eyebrow">PREGUNTAS FRECUENTES</span><h2 id="faq-heading">Información clara, con tiempo para cada decisión.</h2><p>Comprar, vender o alquilar en Traslasierra tiene sus propios ritmos. Estas respuestas reúnen lo que solemos conversar en la primera consulta.</p></div>
          <div className="faq-list"><details open><summary>¿Puedo consultar aunque todavía no tenga una decisión tomada?</summary><p>Claro. Muchas búsquedas comienzan como una conversación: podemos ayudarte a ordenar ubicación, presupuesto, tiempos y necesidades sin compromiso, para que el próximo paso sea realmente tuyo.</p></details><details><summary>¿Qué información conviene tener para publicar una propiedad?</summary><p>Alcanza con una primera descripción, la localidad, el tipo de operación y la documentación disponible. Luego relevamos los detalles, coordinamos las imágenes y te acompañamos a definir una presentación honesta y atractiva.</p></details><details><summary>¿Cómo es el acompañamiento durante una operación?</summary><p>Seguimos el proceso de cerca: respondemos consultas, coordinamos visitas, compartimos la información relevante y mantenemos una comunicación clara entre las partes hasta el cierre de la operación.</p></details><details><summary>¿Trabajan sólo en una localidad?</summary><p>Nos especializamos en Traslasierra, Córdoba, y conocemos el carácter de cada zona. Esa mirada local nos permite orientar mejor tanto a quienes llegan como a quienes ya viven en el valle.</p></details></div>
        </section>

        <section className="sell-banner" data-scroll-reveal>
          <div><span className="eyebrow">¿TENÉS UNA PROPIEDAD?</span><h2>Tu próximo capítulo<br />puede empezar acá.</h2></div>
          <a className="button button-light" href={createWhatsAppUrl("Hola, quiero ofrecer mi propiedad. Me gustaría conversar sobre la venta o el alquiler.")} target="_blank" rel="noopener noreferrer">Ofrecer mi propiedad por WhatsApp <ArrowRight size={17} /></a>
        </section>

        <section id="contacto" className="contact-section" aria-labelledby="contacto-heading" data-scroll-reveal>
          <div className="contact-copy"><span className="eyebrow">CONTACTO</span><h2 id="contacto-heading">Estamos para ayudarte.</h2><p>Consultanos por una propiedad o escribinos para conversar sobre la tuya.</p></div>
          <div className="contact-actions">
            <a className="contact-action contact-action-whatsapp" href={createWhatsAppUrl("Hola, quiero hacer una consulta inmobiliaria.")} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={19}/><span><strong>WhatsApp</strong><small>{BUSINESS_PHONE_DISPLAY}</small></span><ArrowRight size={16}/></a>
            <a className="contact-action contact-action-instagram" href={INSTAGRAM_PROFILE_URL} target="_blank" rel="noopener noreferrer"><Instagram size={19}/><span><strong>Instagram</strong><small>@inmobiliaria.riviera</small></span><ArrowRight size={16}/></a>
            <a className="contact-action contact-action-youtube" href={YOUTUBE_CHANNEL_URL} target="_blank" rel="noopener noreferrer"><Youtube size={19}/><span><strong>YouTube</strong><small>Inmobiliaria.Riviera</small></span><ArrowRight size={16}/></a>
            <a className="contact-action contact-action-facebook" href={createFacebookShareUrl()} target="_blank" rel="noopener noreferrer" title="Compartir el portal en Facebook"><Facebook size={19}/><span><strong>Facebook</strong><small>Compartí el portal</small></span><ArrowRight size={16}/></a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
