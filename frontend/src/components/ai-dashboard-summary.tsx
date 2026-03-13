"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { aiApi } from "@/lib/api/client";

export default function AiDashboardSummary() {
  const [enabled, setEnabled] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery<{
    summary: string;
    patient_count: number;
    generated_at: string;
  }>({
    queryKey: ["ai-dashboard-summary"],
    queryFn: () => aiApi.dashboardSummary().then((r) => r.data),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (!enabled) {
    return (
      <div className="rounded-xl border bg-gradient-to-br from-amber-50/60 via-orange-50/30 to-yellow-50/40 p-5">
        <button
          onClick={() => setEnabled(true)}
          className="flex items-center gap-2.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="size-4 text-primary" />
          </div>
          Generate AI Practice Overview
        </button>
        <p className="text-xs text-muted-foreground mt-1.5 ml-[42px]">
          Get an AI summary of your patients&apos; progress and priorities for today
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-gradient-to-br from-amber-50/60 via-orange-50/30 to-yellow-50/40 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="font-medium text-sm">Practice Overview</h2>
            {data?.generated_at && (
              <p className="text-[10px] text-muted-foreground">
                {data.patient_count} patient{data.patient_count !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh summary"
        >
          <RefreshCw className="size-3.5" />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
          <Loader2 className="size-4 animate-spin" />
          Analyzing your practice...
        </div>
      )}

      {isError && (
        <p className="text-sm text-muted-foreground">
          AI summary unavailable at this time.
        </p>
      )}

      {data && (
        <p className="text-sm leading-relaxed">{data.summary}</p>
      )}
    </div>
  );
}
