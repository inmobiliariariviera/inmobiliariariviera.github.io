import { describe, expect, it } from "vitest";
import { getYouTubeVideoId } from "./youtube";

describe("getYouTubeVideoId", () => {
  it.each([
    "https://youtu.be/dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30",
    "https://m.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  ])("accepts valid HTTPS video URL: %s", (url) => {
    expect(getYouTubeVideoId(url)).toBe("dQw4w9WgXcQ");
  });

  it.each([
    "http://youtube.com/watch?v=dQw4w9WgXcQ",
    "https://notyoutube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=short",
    "https://youtube.com/channel/dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ/extra",
    "not a URL",
  ])("rejects invalid video URL: %s", (url) => {
    expect(getYouTubeVideoId(url)).toBeNull();
  });
});
