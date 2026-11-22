import { Check, ChevronDown, Menu, Moon, Search, Sun, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, MouseEvent } from "react";
import { normalizePropertyCategory, PROPERTY_CATEGORIES } from "@/lib/propertyCategories";

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openCategoryOperation, setOpenCategoryOperation] = useState<"venta" | "alquiler" | null>(null);
  const [headerSearch, setHeaderSearch] = useState("");
  const [routeKey, setRouteKey] = useState(() => window.location.hash || window.location.search);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const saved = window.localStorage.getItem("riviera-theme") ?? window.localStorage.getItem("champaqui-theme");
      return saved === "dark" ? "dark" : "light";
    }
    catch { return "light"; }
  });
  const [isScrolled, setIsScrolled] = useState(false);
  const [location, navigate] = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchToggleRef = useRef<HTMLButtonElement>(null);
  const headerNavRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem("riviera-theme", theme);
      window.localStorage.removeItem("champaqui-theme");
    } catch { /* storage may be disabled */ }
  }, [theme]);

  useEffect(() => {
    const updateScroll = () => setIsScrolled(window.scrollY > 12);
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    return () => window.removeEventListener("scroll", updateScroll);
  }, []);

  useEffect(() => {
    const syncRouteKey = () => setRouteKey(window.location.hash || window.location.search);
    window.addEventListener("hashchange", syncRouteKey);
    return () => window.removeEventListener("hashchange", syncRouteKey);
  }, []);

  useEffect(() => {
    if (!openCategoryOperation) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !headerNavRef.current?.contains(event.target)) setOpenCategoryOperation(null);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenCategoryOperation(null);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [openCategoryOperation]);

  useEffect(() => {
    if (!searchOpen) return;
    const frame = window.requestAnimationFrame(() => searchInputRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
        searchToggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [searchOpen]);

  const closeMenus = () => {
    setMenuOpen(false);
    setSearchOpen(false);
    setOpenCategoryOperation(null);
  };

  const goToOperation = (event: MouseEvent<HTMLAnchorElement>, operation: "venta" | "alquiler") => {
    event.preventDefault();
    closeMenus();
    navigate(`/?operacion=${operation}`);
    window.setTimeout(() => {
      document.getElementById("propiedades")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }, 140);
  };

  const goToPropertyCategory = (operation: "venta" | "alquiler", category: string) => {
    closeMenus();
    const params = new URLSearchParams({ operacion: operation });
    if (category !== "Todas") params.set("categoria", category);
    navigate(`/?${params.toString()}`);
    window.setTimeout(() => {
      document.getElementById("propiedades")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }, 140);
  };

  const updateGlow = (event: MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--glow-x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--glow-y", `${event.clientY - rect.top}px`);
  };

  const goToSection = (event: MouseEvent<HTMLAnchorElement>, section: string) => {
    event.preventDefault();
    closeMenus();
    navigate(`/?seccion=${encodeURIComponent(section)}`);
    window.setTimeout(() => {
      const target = document.getElementById(section);
      if (!target) return;
      target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }, location === "/" ? 80 : 180);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = headerSearch.trim();
    if (!value) {
      searchInputRef.current?.focus();
      return;
    }
    const currentQuery = window.location.hash.split("?")[1] ?? window.location.search.slice(1);
    const params = new URLSearchParams(currentQuery);
    params.set("busqueda", value);
    navigate(`/?${params.toString()}`);
    closeMenus();
    setHeaderSearch("");
    window.setTimeout(() => document.getElementById("propiedades")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }), 100);
  };

  const routeParams = new URLSearchParams(routeKey.split("?")[1] ?? window.location.search.slice(1));
  const currentOperation = routeParams.get("operacion");
  const currentCategory = normalizePropertyCategory(routeParams.get("categoria"));

  const renderOperationMenu = (operation: "venta" | "alquiler", label: string) => {
    const expanded = openCategoryOperation === operation;
    const menuId = `header-category-menu-${operation}`;
    const categoryOption = (category: string, title: string) => {
      const selected = currentOperation === operation && currentCategory === category;
      return (
        <button key={category} type="button" role="menuitem" className={selected ? "header-category-option is-selected" : "header-category-option"} aria-pressed={selected} onClick={() => goToPropertyCategory(operation, category)}>
          <span>{title}</span>{selected && <Check size={14} aria-hidden="true" />}
        </button>
      );
    };
    return (
      <div className={`header-operation-menu ${expanded ? "is-open" : ""}`} key={operation} onMouseEnter={() => setOpenCategoryOperation(operation)} onMouseLeave={() => setOpenCategoryOperation((current) => current === operation ? null : current)}>
        <Link href={`/?operacion=${operation}`} onClick={(event) => goToOperation(event, operation)} onFocus={() => setOpenCategoryOperation(operation)} onMouseMove={updateGlow} aria-haspopup="menu" aria-expanded={expanded} aria-controls={menuId}>
          <span>{label}</span><ChevronDown size={13} aria-hidden="true" />
        </Link>
        <div className="header-category-submenu" id={menuId} role="menu" aria-label={`Tipos de propiedad para ${label.toLowerCase()}`}>
          <span className="header-category-subtitle">{label.toUpperCase()} · TIPO DE PROPIEDAD</span>
          {categoryOption("Todas", "Todos los tipos")}
          {PROPERTY_CATEGORIES.map((category) => categoryOption(category, category))}
        </div>
      </div>
    );
  };

  return (
    <header className={`site-header ${isScrolled ? "is-scrolled" : ""} ${searchOpen ? "search-open" : ""}`}>
      <div className="header-inner">
        <Link href="/" className="brand-lockup" aria-label="RIVIERA Inmobiliaria — inicio" onClick={closeMenus}>
          <span className="brand-mark"><img src={`${import.meta.env.BASE_URL}riviera-brand-mark.png`} alt="Isotipo de montaña de RIVIERA" /></span>
          <span className="brand-text"><strong>RIVIERA</strong><small>INMOBILIARIA</small></span>
        </Link>

        <nav ref={headerNavRef} className={`header-nav ${menuOpen ? "is-open" : ""}`} aria-label="Navegación principal">
          <a className="header-section-link header-section-link-featured" href="/?seccion=propiedades" onClick={(event) => goToSection(event, "propiedades")} onMouseMove={updateGlow}>Propiedades</a>
          {renderOperationMenu("venta", "Comprar")}
          {renderOperationMenu("alquiler", "Alquilar")}
          <a className="header-section-link" href="/?seccion=resenas" onClick={(event) => goToSection(event, "resenas")} onMouseMove={updateGlow}>Reseñas</a>
          <a className="header-section-link" href="/?seccion=preguntas" onClick={(event) => goToSection(event, "preguntas")} onMouseMove={updateGlow}>Preguntas</a>
          <a className="header-section-link" href="/?seccion=contacto" onClick={(event) => goToSection(event, "contacto")} onMouseMove={updateGlow}>Contacto</a>
        </nav>

        <div className="header-tools">
          <button className="header-theme-toggle" type="button" aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"} aria-pressed={theme === "dark"} title={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"} onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button ref={searchToggleRef} className="header-search-toggle" type="button" aria-label={searchOpen ? "Cerrar búsqueda" : "Abrir búsqueda"} aria-expanded={searchOpen} aria-controls="header-search-panel" onClick={() => { setMenuOpen(false); setOpenCategoryOperation(null); setSearchOpen((open) => !open); }}>
            {searchOpen ? <X size={19} /> : <Search size={19} />}
          </button>
          <button className="mobile-menu-toggle" type="button" aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuOpen} onClick={() => { setSearchOpen(false); setOpenCategoryOperation(null); setMenuOpen((open) => !open); }}>
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>

        <form id="header-search-panel" className={`header-search-popover ${searchOpen ? "is-open" : ""}`} role="search" onSubmit={submitSearch}>
          <label className="sr-only" htmlFor="header-property-search">Buscar propiedades</label>
          <input ref={searchInputRef} id="header-property-search" type="search" value={headerSearch} onChange={(event) => setHeaderSearch(event.target.value)} placeholder="Buscar..." maxLength={120} />
          <button type="submit" className="header-search-submit" aria-label="Buscar en propiedades"><Search size={17} aria-hidden="true" /></button>
        </form>
      </div>
    </header>
  );
}
