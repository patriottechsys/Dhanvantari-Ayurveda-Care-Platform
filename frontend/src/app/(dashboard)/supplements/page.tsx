"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Leaf, Flame, Droplets, Wind, Brain, LayoutGrid, List } from "lucide-react";
import { supplementsApi } from "@/lib/api/client";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Supplement = {
  id: number;
  name: string;
  name_sanskrit?: string;
  category?: string;
  purpose?: string;
  dosha_effect?: string;
  typical_dose?: string;
  cautions?: string;
};

const CATEGORIES = ["Adaptogenic", "Rejuvenative", "Nervine", "Digestive", "Immunomodulator", "Nutritive", "Detoxifying", "Anti-inflammatory"];

/* ── Placeholder system for supplements without images ── */
const CATEGORY_PLACEHOLDER: Record<string, { from: string; to: string; icon: typeof Leaf }> = {
  Rejuvenative:       { from: "#D1FAE5", to: "#A7F3D0", icon: Leaf },
  Adaptogenic:        { from: "#D1FAE5", to: "#A7F3D0", icon: Leaf },
  Digestive:          { from: "#FEF3C7", to: "#FDE68A", icon: Flame },
  Detoxifying:        { from: "#D1FAE5", to: "#6EE7B7", icon: Droplets },
  Respiratory:        { from: "#DBEAFE", to: "#93C5FD", icon: Wind },
  Nervine:            { from: "#EDE9FE", to: "#C4B5FD", icon: Brain },
  Immunomodulator:    { from: "#DBEAFE", to: "#93C5FD", icon: Leaf },
  Nutritive:          { from: "#FEF3C7", to: "#FDE68A", icon: Leaf },
  "Anti-inflammatory": { from: "#FCE7F3", to: "#F9A8D4", icon: Droplets },
};
const DEFAULT_PLACEHOLDER = { from: "#F3F4F6", to: "#E5E7EB", icon: Leaf };

function SupplementPlaceholder({ name, nameSanskrit, category }: { name: string; nameSanskrit?: string; category?: string }) {
  const config = (category && CATEGORY_PLACEHOLDER[category]) || DEFAULT_PLACEHOLDER;
  const IconComp = config.icon;
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center gap-1.5 rounded-lg"
      style={{ background: `linear-gradient(135deg, ${config.from}, ${config.to})` }}
    >
      <IconComp className="size-6 opacity-40" style={{ color: "#374151" }} />
      {nameSanskrit && (
        <p className="text-[10px] italic text-gray-600/70 text-center px-2 leading-tight line-clamp-1">
          {nameSanskrit}
        </p>
      )}
    </div>
  );
}

export default function SupplementsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"side" | "top">("side");

  const { data: supplements = [], isLoading } = useQuery<Supplement[]>({
    queryKey: ["supplements", search, category],
    queryFn: () =>
      supplementsApi
        .list({ search: search || undefined, category: category || undefined })
        .then((r) => r.data),
  });

  return (
    <div className="p-6 space-y-5 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Supplements Library</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {supplements.length} classical Ayurvedic herbs &amp; supplements
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search supplements…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-48">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
        <div className="flex gap-1 ml-auto">
          <button
            onClick={() => setViewMode("side")}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              viewMode === "side" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
            title="Side image layout"
          >
            <List className="size-4" />
          </button>
          <button
            onClick={() => setViewMode("top")}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              viewMode === "top" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
            title="Top image layout"
          >
            <LayoutGrid className="size-4" />
          </button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground py-12 text-center">Loading…</div>
      ) : (
        <div className={cn(
          "grid gap-3",
          viewMode === "side" ? "sm:grid-cols-2 lg:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"
        )}>
          {supplements.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border bg-card overflow-hidden cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => setExpanded(expanded === s.id ? null : s.id)}
            >
              {/* Top Image Layout */}
              {viewMode === "top" && (
                <div className="w-full h-[140px]">
                  <SupplementPlaceholder name={s.name} nameSanskrit={s.name_sanskrit} category={s.category} />
                </div>
              )}

              <div className={cn(
                "p-4 space-y-2",
                viewMode === "side" && "flex gap-3"
              )}>
                {/* Side Image Layout */}
                {viewMode === "side" && (
                  <div className="w-[100px] h-[100px] shrink-0 rounded-lg overflow-hidden">
                    <SupplementPlaceholder name={s.name} nameSanskrit={s.name_sanskrit} category={s.category} />
                  </div>
                )}

                <div className={cn("space-y-2 min-w-0", viewMode === "side" && "flex-1")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{s.name}</p>
                      {s.name_sanskrit && (
                        <p className="text-xs text-muted-foreground italic">{s.name_sanskrit}</p>
                      )}
                    </div>
                    {s.category && (
                      <Badge variant="secondary" className="shrink-0 text-xs">{s.category}</Badge>
                    )}
                  </div>

                  {s.dosha_effect && (
                    <p className="text-xs text-muted-foreground">{s.dosha_effect}</p>
                  )}

                  {expanded === s.id && (
                    <div className="pt-2 border-t space-y-2 text-xs text-muted-foreground">
                      {s.purpose && (
                        <div>
                          <p className="font-medium text-foreground mb-0.5">Purpose</p>
                          <p>{s.purpose}</p>
                        </div>
                      )}
                      {s.typical_dose && (
                        <div>
                          <p className="font-medium text-foreground mb-0.5">Typical Dose</p>
                          <p>{s.typical_dose}</p>
                        </div>
                      )}
                      {s.cautions && (
                        <div>
                          <p className="font-medium text-amber-600 mb-0.5">Cautions</p>
                          <p className="text-amber-700">{s.cautions}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {supplements.length === 0 && (
            <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
              No supplements match your search.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
