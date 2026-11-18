const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Return a YouTube video ID only for HTTPS URLs on YouTube-owned domains. */
export function getYouTubeVideoId(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;

    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    const isYouTubeHost =
      hostname === "youtu.be" ||
      hostname === "youtube.com" ||
      hostname.endsWith(".youtube.com") ||
      hostname === "youtube-nocookie.com" ||
      hostname.endsWith(".youtube-nocookie.com");
    if (!isYouTubeHost) return null;

    let videoId: string | null = null;
    if (hostname === "youtu.be") {
      const pathParts = url.pathname.split("/").filter(Boolean);
      if (pathParts.length === 1) videoId = pathParts[0];
    } else if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v");
    } else {
      videoId = url.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})\/?$/)?.[1] ?? null;
    }

    return videoId && YOUTUBE_VIDEO_ID.test(videoId) ? videoId : null;
  } catch {
    return null;
  }
}
