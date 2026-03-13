"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Video, ExternalLink, X, Loader2 } from "lucide-react";
import { videosApi } from "@/lib/api/client";
import { parseVideoUrl } from "@/lib/video-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { VideoThumbnail, VideoPlayerModal } from "@/components/video-player-modal";
import type { VideoReference } from "@/lib/video-helpers";

interface VideoManagerProps {
  entityType: string;
  entityId: number;
  entityLabel?: string;
}

type VideoForm = {
  title: string;
  url: string;
  language: string;
  source_name: string;
  duration_display: string;
  is_primary: boolean;
};

const EMPTY_FORM: VideoForm = {
  title: "",
  url: "",
  language: "English",
  source_name: "",
  duration_display: "",
  is_primary: false,
};

function apiToRef(v: Record<string, unknown>): VideoReference {
  return {
    id: String(v.id),
    title: (v.title as string) ?? "",
    url: (v.url as string) ?? "",
    platform: (v.platform as "youtube" | "vimeo" | "other") ?? "other",
    embedUrl: (v.embed_url as string) ?? "",
    thumbnailUrl: (v.thumbnail_url as string) ?? "",
    durationDisplay: (v.duration_display as string) ?? undefined,
    language: (v.language as string) ?? undefined,
    sourceName: (v.source_name as string) ?? undefined,
    isPrimary: (v.is_primary as boolean) ?? false,
  };
}

export default function VideoManager({ entityType, entityId, entityLabel }: VideoManagerProps) {
  const qc = useQueryClient();
  const queryKey = ["videos", entityType, entityId];

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<VideoForm>(EMPTY_FORM);
  const [activeVideo, setActiveVideo] = useState<VideoReference | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: videos = [], isLoading } = useQuery<VideoReference[]>({
    queryKey,
    queryFn: () =>
      videosApi
        .list({ entity_type: entityType, entity_id: entityId })
        .then((r) => (r.data as Record<string, unknown>[]).map(apiToRef)),
  });

  const saveMutation = useMutation({
    mutationFn: async (data: VideoForm) => {
      const parsed = parseVideoUrl(data.url);
      const payload = {
        title: data.title,
        url: data.url,
        platform: parsed.platform,
        embed_url: parsed.embedUrl,
        thumbnail_url: parsed.thumbnailUrl,
        language: data.language || "English",
        source_name: data.source_name || null,
        duration_display: data.duration_display || null,
        is_primary: data.is_primary,
        entity_type: entityType,
        entity_id: entityId,
      };
      if (editingId) {
        return videosApi.update(editingId, payload);
      }
      return videosApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => videosApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      setDeleteConfirm(null);
    },
  });

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowDialog(true);
  }

  function openEdit(v: VideoReference) {
    setEditingId(Number(v.id));
    setForm({
      title: v.title,
      url: v.url,
      language: v.language ?? "English",
      source_name: v.sourceName ?? "",
      duration_display: v.durationDisplay ?? "",
      is_primary: v.isPrimary ?? false,
    });
    setShowDialog(true);
  }

  function closeDialog() {
    setShowDialog(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function handleUrlChange(url: string) {
    setForm((f) => ({ ...f, url }));
    if (url && !form.title) {
      const parsed = parseVideoUrl(url);
      if (parsed.platform !== "other") {
        setForm((f) => ({ ...f, title: `${parsed.platform === "youtube" ? "YouTube" : "Vimeo"} Video` }));
      }
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Video className="size-4" />
          Videos {entityLabel && <span className="text-muted-foreground font-normal">for {entityLabel}</span>}
        </h3>
        <Button size="sm" variant="outline" onClick={openAdd} className="gap-1.5 text-xs h-7">
          <Plus className="size-3" />
          Add Video
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-4 text-center">Loading videos...</div>
      ) : videos.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center border rounded-lg border-dashed">
          No videos yet. Add a YouTube or Vimeo link to get started.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {videos.map((v) => (
            <div key={v.id} className="relative group">
              <VideoThumbnail video={v} onClick={() => setActiveVideo(v)} />
              {/* Action buttons overlay */}
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); openEdit(v); }}
                  className="p-1 rounded bg-black/60 text-white hover:bg-black/80 transition-colors"
                  title="Edit"
                >
                  <Pencil className="size-3" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirm(Number(v.id)); }}
                  className="p-1 rounded bg-red-600/80 text-white hover:bg-red-700 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
              {v.isPrimary && (
                <span className="absolute top-1 left-1 text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-medium">
                  Primary
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onClose={closeDialog} title={editingId ? "Edit Video" : "Add Video"}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (form.url && form.title) saveMutation.mutate(form);
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label>Video URL *</Label>
            <Input
              placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
              value={form.url}
              onChange={(e) => handleUrlChange(e.target.value)}
              required
            />
            {form.url && (() => {
              const parsed = parseVideoUrl(form.url);
              if (parsed.platform !== "other" && parsed.thumbnailUrl) {
                return (
                  <div className="mt-2 rounded-lg overflow-hidden border bg-muted h-32 relative">
                    <img src={parsed.thumbnailUrl} alt="Preview" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded capitalize">
                      {parsed.platform}
                    </span>
                  </div>
                );
              }
              return null;
            })()}
          </div>

          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input
              placeholder="e.g. Sun Salutation Tutorial"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Source / Channel</Label>
              <Input
                placeholder="e.g. Yoga With Adriene"
                value={form.source_name}
                onChange={(e) => setForm((f) => ({ ...f, source_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Duration</Label>
              <Input
                placeholder="e.g. 12:30"
                value={form.duration_display}
                onChange={(e) => setForm((f) => ({ ...f, duration_display: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Language</Label>
              <Select
                value={form.language}
                onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Sanskrit">Sanskrit</option>
                <option value="Tamil">Tamil</option>
                <option value="Telugu">Telugu</option>
                <option value="Other">Other</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>&nbsp;</Label>
              <label className="flex items-center gap-2 text-sm cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={form.is_primary}
                  onChange={(e) => setForm((f) => ({ ...f, is_primary: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                Primary video
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={closeDialog}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saveMutation.isPending || !form.url || !form.title} className="gap-1.5">
              {saveMutation.isPending && <Loader2 className="size-3 animate-spin" />}
              {editingId ? "Save Changes" : "Add Video"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm !== null} onClose={() => setDeleteConfirm(null)} title="Delete Video">
        <p className="text-sm text-muted-foreground mb-4">Are you sure you want to remove this video? This cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteConfirm !== null && deleteMutation.mutate(deleteConfirm)}
            disabled={deleteMutation.isPending}
            className="gap-1.5"
          >
            {deleteMutation.isPending && <Loader2 className="size-3 animate-spin" />}
            Delete
          </Button>
        </div>
      </Dialog>

      {/* Video Player */}
      <VideoPlayerModal video={activeVideo} onClose={() => setActiveVideo(null)} />
    </div>
  );
}
