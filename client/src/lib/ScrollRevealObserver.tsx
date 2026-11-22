import { useEffect } from "react";
import { useLocation } from "wouter";

export default function ScrollRevealObserver() {
  const [location] = useLocation();

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-scroll-reveal]"));
    const root = document.documentElement;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
      root.classList.remove("has-scroll-reveal");
      elements.forEach((element) => element.classList.add("is-revealed"));
      return;
    }

    root.classList.add("has-scroll-reveal");
    const revealVisibleElements = () => {
      const viewportHeight = window.innerHeight || root.clientHeight;
      elements.forEach((element) => {
        const bounds = element.getBoundingClientRect();
        if (bounds.top < viewportHeight && bounds.bottom > 0) {
          element.classList.add("is-revealed");
        }
      });
    };
    revealVisibleElements();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -36px 0px" },
    );

    elements.forEach((element, index) => {
      element.style.setProperty("--scroll-delay", `${(index % 3) * 70}ms`);
      observer.observe(element);
    });

    // Never leave page content hidden if an embedded browser or WebView fails to
    // deliver IntersectionObserver callbacks after the route has changed.
    const fallbackTimer = window.setTimeout(() => {
      elements.forEach((element) => element.classList.add("is-revealed"));
      observer.disconnect();
    }, 2500);

    return () => {
      window.clearTimeout(fallbackTimer);
      observer.disconnect();
    };
  }, [location]);

  return null;
}
