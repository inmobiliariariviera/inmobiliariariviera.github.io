import { useEffect } from "react";
import { BRAND_IMAGE_URL } from "@/lib/propertyMeta";

type PageMetadata = {
  title: string;
  description: string;
  url: string;
  image?: string;
  robots?: string;
  jsonLd?: Record<string, unknown>;
};

function setMeta(selector: string, attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.append(element);
  }
  element.content = content;
}

export function usePageMetadata(metadata: PageMetadata) {
  useEffect(() => {
    document.title = metadata.title;
    const image = metadata.image || BRAND_IMAGE_URL;
    setMeta('meta[name="description"]', "name", "description", metadata.description);
    setMeta('meta[name="robots"]', "name", "robots", metadata.robots || "index,follow");
    setMeta('meta[property="og:type"]', "property", "og:type", "website");
    setMeta('meta[property="og:title"]', "property", "og:title", metadata.title);
    setMeta('meta[property="og:description"]', "property", "og:description", metadata.description);
    setMeta('meta[property="og:url"]', "property", "og:url", metadata.url);
    setMeta('meta[property="og:site_name"]', "property", "og:site_name", "RIVIERA Inmobiliaria");
    setMeta('meta[property="og:image"]', "property", "og:image", image);
    setMeta('meta[property="og:image:alt"]', "property", "og:image:alt", "RIVIERA Inmobiliaria");
    setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", metadata.title);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", metadata.description);
    setMeta('meta[name="twitter:image"]', "name", "twitter:image", image);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.append(canonical);
    }
    canonical.href = metadata.url;

    let jsonLd = document.head.querySelector<HTMLScriptElement>('script[type="application/ld+json"][data-page-metadata]');
    if (metadata.jsonLd) {
      if (!jsonLd) {
        jsonLd = document.createElement("script");
        jsonLd.type = "application/ld+json";
        jsonLd.dataset.pageMetadata = "true";
        document.head.append(jsonLd);
      }
      jsonLd.textContent = JSON.stringify(metadata.jsonLd).replace(/</g, "\\u003c");
    } else {
      jsonLd?.remove();
    }
  }, [metadata.description, metadata.image, metadata.jsonLd, metadata.robots, metadata.title, metadata.url]);
}
