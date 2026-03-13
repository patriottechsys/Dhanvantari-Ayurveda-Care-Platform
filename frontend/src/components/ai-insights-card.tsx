"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { aiApi } from "@/lib/api/client";

export default function AiInsightsCard({ patientId }: { patientId: number }) {
  const [enabled, setEnabled] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery<{
    insights: string;
    checkin_count?: number;
  }>({
    queryKey: ["ai-insights", patientId],
    queryFn: () => aiApi.insights(patientId).then((r) => r.data),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (!enabled) {
    return (
      <section className="rounded-xl border bg-gradient-to-br from-amber-50/60 to-orange-50/40 p-5">
        <button
          onClick={() => setEnabled(true)}
          className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <Sparkles className="size-4" />
          Generate AI Insights from check-in data
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-xl border bg-gradient-to-br from-amber-50/60 to-orange-50/40 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h2 className="font-medium text-sm">AI Insights</h2>
        </div>
        <button
          onClick={() => refetch()}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh insights"
        >
          <RefreshCw className="size-3.5" />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="size-4 animate-spin" />
          Analyzing check-in trends...
        </div>
      )}

      {isError && (
        <p className="text-sm text-muted-foreground">
          AI insights unavailable. Ensure the patient has at least 3 check-ins.
        </p>
      )}

      {data && (
        <>
          <p className="text-sm leading-relaxed">{data.insights}</p>
          {data.checkin_count && (
            <p className="text-[10px] text-muted-foreground">
              Based on {data.checkin_count} check-in{data.checkin_count !== 1 ? "s" : ""}
            </p>
          )}
        </>
      )}
    </section>
  );
}
