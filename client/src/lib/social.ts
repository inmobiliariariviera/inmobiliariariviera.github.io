export const INSTAGRAM_PROFILE_URL = "https://www.instagram.com/inmobiliaria.riviera/";
export const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@inmobiliaria.riviera";

export function createFacebookShareUrl() {
  const portalUrl = `${window.location.origin}${window.location.pathname}`;
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(portalUrl)}`;
}
