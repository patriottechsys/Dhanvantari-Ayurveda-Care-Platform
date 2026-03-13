"use client";

import { useEffect, useCallback } from "react";
import { X, ExternalLink, Copy, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoReference } from "@/lib/video-helpers";

interface VideoPlayerModalProps {
  video: VideoReference | null;
  onClose: () => void;
}

export function VideoPlayerModal({ video, onClose }: VideoPlayerModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (video) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [video, handleEscape]);

  if (!video) return null;

  const platformLabel =
    video.platform === "youtube" ? "YouTube" : video.platform === "vimeo" ? "Vimeo" : "Video";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-3xl rounded-xl bg-card shadow-xl border border-border"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-4 px-5 pt-4 pb-3">
            <h3 className="text-sm font-semibold truncate">{video.title}</h3>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Video embed */}
          <div className="px-5">
            <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src={video.embedUrl + (video.embedUrl.includes("?") ? "&" : "?") + "autoplay=1"}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={video.title}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="text-xs text-muted-foreground">
              {video.sourceName && <span>{video.sourceName} &middot; </span>}
              <span>{platformLabel}</span>
              {video.durationDisplay && <span> &middot; {video.durationDisplay}</span>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => window.open(video.url, "_blank")}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
              >
                <ExternalLink className="size-3" />
                Open in New Tab
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(video.url)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
              >
                <Copy className="size-3" />
                Copy Link
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Small thumbnail used on library cards ── */
interface VideoThumbnailProps {
  video: VideoReference;
  onClick: () => void;
  className?: string;
}

export function VideoThumbnail({ video, onClick, className }: VideoThumbnailProps) {
  const platformLabel =
    video.platform === "youtube" ? "YouTube" : video.platform === "vimeo" ? "Vimeo" : "Video";

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "group rounded-lg overflow-hidden border bg-muted text-left hover:border-primary/40 transition-colors",
        className
      )}
    >
      {/* Thumbnail area */}
      <div className="relative w-full h-24 bg-gradient-to-br from-gray-200 to-gray-300">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="size-6 text-gray-500" />
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
            <Play className="size-4 text-white ml-0.5" fill="white" />
          </div>
        </div>
      </div>
      {/* Info */}
      <div className="p-2">
        <p className="text-xs font-medium truncate">{video.title}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {platformLabel}
          {video.durationDisplay && <span> &middot; {video.durationDisplay}</span>}
        </p>
      </div>
    </button>
  );
}
