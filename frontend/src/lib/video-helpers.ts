/**
 * Video URL parsing and metadata extraction utilities.
 * Supports YouTube and Vimeo URLs.
 */

export interface VideoMetadata {
  platform: "youtube" | "vimeo" | "other";
  videoId: string | null;
  embedUrl: string;
  thumbnailUrl: string;
  originalUrl: string;
}

/**
 * Parse a video URL and extract platform, ID, embed URL, and thumbnail URL.
 */
export function parseVideoUrl(url: string): VideoMetadata {
  const trimmed = url.trim();

  // YouTube patterns
  const ytPatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of ytPatterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const videoId = match[1];
      return {
        platform: "youtube",
        videoId,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        originalUrl: trimmed,
      };
    }
  }

  // Vimeo patterns
  const vimeoPatterns = [
    /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/,
  ];
  for (const pattern of vimeoPatterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const videoId = match[1];
      return {
        platform: "vimeo",
        videoId,
        embedUrl: `https://player.vimeo.com/video/${videoId}`,
        thumbnailUrl: "", // Vimeo thumbnails require API call
        originalUrl: trimmed,
      };
    }
  }

  // Fallback
  return {
    platform: "other",
    videoId: null,
    embedUrl: trimmed,
    thumbnailUrl: "",
    originalUrl: trimmed,
  };
}

/**
 * Format seconds to display string (e.g., "4:32")
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Video reference type used across yoga and pranayama
 */
export interface VideoReference {
  id: string;
  title: string;
  url: string;
  platform: "youtube" | "vimeo" | "other";
  embedUrl: string;
  thumbnailUrl: string;
  durationDisplay?: string;
  language?: string;
  sourceName?: string;
  isPrimary?: boolean;
}
