import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Facebook, Instagram, MapPin, Search, SlidersHorizontal, X, Youtube } from "lucide-react";
import SiteHeader from "@/components/real-estate/SiteHeader";
import SiteFooter from "@/components/real-estate/SiteFooter";
import PropertyCard from "@/components/real-estate/PropertyCard";
import PropertyFilters, { type PropertyFilterValues } from "@/components/real-estate/PropertyFilters";
import TrustSection from "@/components/real-estate/TrustSection";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Link } from "wouter";
import { usePublicProperties } from "@/lib/usePublicProperties";
import { DEFAULT_PROPERTY_FILTERS, countActivePropertyFilters, matchesPropertyFilters, type PropertyFilters as PropertyFilterState } from "@/lib/propertyFilters";
import { LOCATION_SCOPE_LABELS, normalizeLocationScope } from "@/lib/locationScopes";
import { BUSINESS_PHONE_DISPLAY, createWhatsAppUrl } from "@/lib/contact";
import { BRAND_IMAGE_URL, PUBLIC_SITE_URL } from "@/lib/propertyMeta";
import { usePageMetadata } from "@/lib/usePageMetadata";
import { createFacebookShareUrl, INSTAGRAM_PROFILE_URL, YOUTUBE_CHANNEL_URL } from "@/lib/social";
import WhatsAppIcon from "@/components/real-estate/WhatsAppIcon";
import ReviewsSection from "@/components/real-estate/ReviewsSection";
import FAQSection from "@/components/real-estate/FAQSection";
import LeadInquiryForm from "@/components/real-estate/LeadInquiryForm";

function filtersFromUrl(): PropertyFilterState {
  const query = new URLSearchParams(window.location.hash.split("?")[1] ?? window.location.search.slice(1));
  const operation = query.get("operacion");
  const category = query.get("categoria");
  const currency = query.get("monedaPrecio");
  const allowedCategories = ["Campo", "Casa", "Terreno", "Departamento", "Local", "Otro"];
  return {
    ...DEFAULT_PROPERTY_FILTERS,
    operation: operation === "alquiler" ? "Alquiler" : operation === "venta" ? "Venta" : "Todas",
    category: allowedCategories.includes(category ?? "") ? category as PropertyFilterState["category"] : "Todas",
    locationScope: normalizeLocationScope(query.get("zona")),
    priceCurrency: currency === "USD" || currency === "ARS" ? currency : "all",
    priceMin: query.get("precioDesde") ?? "",
    priceMax: query.get("precioHasta") ?? "",
    surfaceMin: query.get("superficieDesde") ?? "",
    surfaceMax: query.get("superficieHasta") ?? "",
  };
}

export default function Home() {
  const [filters, setFilters] = useState<PropertyFilterState>(filtersFromUrl);
  const [searchText, setSearchText] = useState(() => new URLSearchParams(window.location.hash.split("?")[1] ?? window.location.search.slice(1)).get("busqueda") ?? "");
  const [showDesktopFilters, setShowDesktopFilters] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const { properties, loading, error } = usePublicProperties();
  const activeFilterCount = countActivePropertyFilters(filters);
  const scrollToListings = () => document.getElementById("propiedades")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });

  usePageMetadata({
    title: "Propiedades en Traslasierra | RIVIERA Inmobiliaria",
    description: "Explorá propiedades en Traslasierra, Córdoba. Casas, campos y terrenos en venta o alquiler con atención directa de RIVIERA Inmobiliaria.",
    url: `${PUBLIC_SITE_URL}/`,
    image: BRAND_IMAGE_URL,
  });

  useEffect(() => {
    let shouldScroll = false;
    try { shouldScroll = sessionStorage.getItem("portal-scroll-to-contact") === "1"; sessionStorage.removeItem("portal-scroll-to-contact"); } catch { /* storage can be disabled */ }
    if (shouldScroll) window.setTimeout(() => document.getElementById("contacto")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }), 80);
  }, []);

  useEffect(() => {
    const syncFiltersFromHash = () => {
      const query = new URLSearchParams(window.location.hash.split("?")[1] ?? window.location.search.slice(1));
      setFilters(filtersFromUrl());
      setSearchText(query.get("busqueda") ?? "");
    };
    window.addEventListener("hashchange", syncFiltersFromHash);
    return () => window.removeEventListener("hashchange", syncFiltersFromHash);
  }, []);

  const filteredProperties = useMemo(
    () => properties.filter((property) => matchesPropertyFilters(property, filters, searchText)),
    [filters, properties, searchText],
  );
  const locationCaption = LOCATION_SCOPE_LABELS[filters.locationScope];
  const updateFilter = <K extends keyof PropertyFilterValues>(key: K, value: PropertyFilterValues[K]) => {
    if (key === "priceCurrency" && value === "all") {
      setFilters((current) => ({ ...current, priceCurrency: "all", priceMin: "", priceMax: "" }));
      return;
    }
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const clearFilters = () => {
    setFilters(DEFAULT_PROPERTY_FILTERS);
    setSearchText("");
  };
  const openFilters = () => {
    if (window.matchMedia("(max-width: 760px)").matches) setMobileFiltersOpen(true);
    else setShowDesktopFilters((open) => !open);
  };
  const resultLabel = `${filteredProperties.length} ${filteredProperties.length === 1 ? "propiedad" : "propiedades"}`;
  const alertsLink = createWhatsAppUrl("Hola, quisiera recibir avisos cuando haya nuevas oportunidades inmobiliarias en Traslasierra.");
  const filterKey = `${JSON.stringify(filters)}-${searchText}`;

  return (
    <div className="app-shell">
      <SiteHeader />
      <main>
        <section className="home-hero" data-scroll-reveal>
          <div className="hero-content">
            <span className="eyebrow hero-eyebrow"><span className="eyebrow-dot" /> PROPIEDADES EN TRASLASIERRA</span>
            <h1>Un lugar propio.<br /><em>Una nueva historia.</em></h1>
            <p>Explorá campos, casas y terrenos con información clara para dar el próximo paso.</p>
            <div className="hero-actions">
              <button className="button button-primary" type="button" onClick={scrollToListings}><Search size={17} /> Explorar propiedades</button>
              <a className="button button-secondary" href={createWhatsAppUrl("Hola, quiero recibir asesoramiento para encontrar una propiedad.")} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={17} /> Hablar con Riviera</a>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="hero-visual-art"><span className="hero-art-sun" /><span className="hero-art-ridge hero-art-ridge-back" /><span className="hero-art-ridge hero-art-ridge-front" /></div>
            <div className="hero-visual-label"><strong>El paisaje también es parte de tu hogar.</strong></div>
          </div>
        </section>

        <section className="search-panel search-panel-location-only" aria-label="Buscar propiedades por ubicación" data-scroll-reveal>
          <div className="search-field location-search">
            <label htmlFor="location-search">Ubicación</label>
            <div className="input-with-icon"><MapPin size={17} /><select id="location-search" value={filters.locationScope} onChange={(event) => updateFilter("locationScope", normalizeLocationScope(event.target.value))} aria-label="Seleccionar una zona permitida"><option value="all">Todas las zonas permitidas</option><option value="traslasierra">Traslasierra · Córdoba</option></select></div>
          </div>
          <button className="search-submit" type="button" onClick={scrollToListings} aria-label="Ver resultados"><Search size={18} /><span>Buscar</span></button>
        </section>

        <section className="listing-section" id="propiedades" data-scroll-reveal>
          <div className="section-heading-row">
            <div>
              <span className="eyebrow">SELECCIÓN DE PROPIEDADES</span>
              <h2>Encontrá tu próximo lugar.</h2>
            </div>
            <div className="listing-filter-actions">
              <button className="filter-toggle" type="button" onClick={openFilters} aria-expanded={showDesktopFilters || mobileFiltersOpen} aria-controls={window.matchMedia("(max-width: 760px)").matches ? "mobile-property-filter-panel" : "property-filter-panel"}><SlidersHorizontal size={16} /> Filtros <span>{activeFilterCount}</span></button>
              {activeFilterCount > 0 && <button className="filter-clear-button" type="button" onClick={clearFilters}>Limpiar</button>}
            </div>
          </div>

          {showDesktopFilters && <div id="property-filter-panel" className="property-filter-panel property-filter-desktop" aria-label="Filtros de propiedades">
            <PropertyFilters idPrefix="desktop-filter" values={filters} onChange={updateFilter} />
          </div>}

          <div className="result-caption" aria-live="polite" aria-atomic="true"><span>{loading ? "Cargando propiedades…" : `${resultLabel} para explorar`}</span><span>{locationCaption} <ArrowRight size={14} aria-hidden="true" /></span></div>
          {error ? <div className="empty-state"><span className="empty-state-icon"><Search size={23} /></span><h3>No pudimos cargar las publicaciones.</h3><p>Revisá la conexión del sitio con Supabase e intentá nuevamente.</p><Link href="/admin" className="button button-secondary">Acceso de administración</Link></div> : loading ? (
            <div className="property-grid loading-property-grid" aria-busy="true" aria-label="Cargando propiedades">
              {Array.from({ length: 3 }, (_, index) => <article className="property-card property-card-skeleton" key={index} aria-hidden="true"><div className="skeleton-image" /><div className="skeleton-copy"><span /><span /><span /></div></article>)}
              <p className="sr-only" role="status">Cargando propiedades.</p>
            </div>
          ) : filteredProperties.length ? (
            <div key={filterKey} className="property-grid property-grid-transition">{filteredProperties.map((property) => <PropertyCard key={property.id ?? property.slug} property={property} />)}</div>
          ) : properties.length === 0 ? (
            <div className="empty-state empty-state-opportunities"><span className="empty-state-icon"><Search size={23} /></span><h3>Estamos incorporando nuevas oportunidades.</h3><p>Si querés, escribinos y te avisamos por WhatsApp cuando haya nuevas propiedades disponibles.</p><a className="button button-primary" href={alertsLink} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={17} /> Recibir avisos por WhatsApp</a></div>
          ) : (
            <div className="empty-state empty-state-opportunities"><span className="empty-state-icon"><Search size={23} /></span><h3>No encontramos propiedades con esos criterios.</h3><p>Probá cambiar algún filtro o pedinos que te avisemos cuando aparezca una oportunidad.</p><div className="empty-state-actions"><button className="button button-secondary" type="button" onClick={clearFilters}>Limpiar filtros</button><a className="button button-primary" href={alertsLink} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={17} /> Recibir avisos</a></div></div>
          )}
        </section>

        <section className="sell-banner" data-scroll-reveal>
          <div><span className="eyebrow">¿TENÉS UNA PROPIEDAD?</span><h2>Tu próximo capítulo<br />puede empezar acá.</h2></div>
          <a className="button button-light" href={createWhatsAppUrl("Hola, quiero ofrecer mi propiedad. Me gustaría conversar sobre la venta o el alquiler.")} target="_blank" rel="noopener noreferrer">Ofrecer mi propiedad por WhatsApp <ArrowRight size={17} /></a>
        </section>

        <TrustSection />
        <FAQSection />
        <ReviewsSection />

        <section id="contacto" className="contact-section" aria-labelledby="contacto-heading" data-scroll-reveal>
          <div className="contact-copy"><span className="eyebrow">CONTACTO</span><h2 id="contacto-heading">Estamos para ayudarte.</h2><p>Consultanos por una propiedad o escribinos para conversar sobre la tuya.</p></div>
          <div className="contact-actions">
            <a className="contact-action contact-action-whatsapp" href={createWhatsAppUrl("Hola, quiero hacer una consulta inmobiliaria.")} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={19} /><span><strong>WhatsApp</strong><small>{BUSINESS_PHONE_DISPLAY}</small></span><ArrowRight size={16} /></a>
            <a className="contact-action contact-action-instagram" href={INSTAGRAM_PROFILE_URL} target="_blank" rel="noopener noreferrer"><Instagram size={19} /><span><strong>Instagram</strong><small>@inmobiliaria.riviera</small></span><ArrowRight size={16} /></a>
            <a className="contact-action contact-action-youtube" href={YOUTUBE_CHANNEL_URL} target="_blank" rel="noopener noreferrer"><Youtube size={19} /><span><strong>YouTube</strong><small>@inmobiliaria.riviera</small></span><ArrowRight size={16} /></a>
            <a className="contact-action contact-action-facebook" href={createFacebookShareUrl()} target="_blank" rel="noopener noreferrer" title="Compartir el portal en Facebook"><Facebook size={19} /><span><strong>Facebook</strong><small>Compartí el portal</small></span><ArrowRight size={16} /></a>
          </div>
          <div className="contact-inquiry-wrap"><LeadInquiryForm propertyTitle="consulta inmobiliaria" /></div>
        </section>
      </main>
      <SiteFooter />

      <Drawer open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <DrawerContent className="property-filter-drawer">
          <DrawerHeader className="property-filter-drawer-header">
            <div><DrawerTitle>Filtrar propiedades</DrawerTitle><DrawerDescription>Combiná los criterios para encontrar opciones.</DrawerDescription></div>
            <DrawerClose asChild><button className="property-filter-close" type="button" aria-label="Cerrar filtros"><X size={19} /></button></DrawerClose>
          </DrawerHeader>
          <div id="mobile-property-filter-panel" className="property-filter-drawer-body"><PropertyFilters idPrefix="mobile-filter" values={filters} onChange={updateFilter} /></div>
          <DrawerFooter className="property-filter-drawer-footer">
            <button className="property-filter-reset" type="button" onClick={clearFilters}>Limpiar filtros</button>
            <DrawerClose asChild><button className="button button-primary" type="button">Ver {resultLabel}</button></DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
