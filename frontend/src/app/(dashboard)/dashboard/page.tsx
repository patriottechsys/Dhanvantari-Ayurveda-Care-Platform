"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Users, ClipboardList, CalendarCheck, TrendingUp } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { patientsApi, followupsApi } from "@/lib/api/client";
import { DoshaBadge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import AiDashboardSummary from "@/components/ai-dashboard-summary";

type PatientSummary = {
  id: number;
  full_name: string;
  dosha_primary?: string;
  created_at: string;
  has_plan?: boolean;
};

type FollowUp = {
  id: number;
  patient_name?: string;
  scheduled_date: string;
  reason?: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const practitioner = useAuthStore((s) => s.practitioner);

  const { data: patients = [] } = useQuery<PatientSummary[]>({
    queryKey: ["patients"],
    queryFn: () => patientsApi.list().then((r) => r.data),
  });

  const { data: upcomingFollowups = [] } = useQuery<FollowUp[]>({
    queryKey: ["followups", "upcoming"],
    queryFn: () => followupsApi.list({ completed: false }).then((r) => r.data),
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const stats = [
    { label: "Total Patients",      value: patients.length,  icon: Users,         color: "text-blue-600 bg-blue-50" },
    { label: "Active Plans",        value: patients.filter((p) => p.has_plan).length, icon: ClipboardList, color: "text-primary bg-primary/10" },
    { label: "Upcoming Follow-ups", value: upcomingFollowups.length, icon: CalendarCheck, color: "text-emerald-600 bg-emerald-50" },
    { label: "Added This Month",    value: patients.filter((p) => new Date(p.created_at) > new Date(Date.now() - 30 * 86400000)).length, icon: TrendingUp, color: "text-violet-600 bg-violet-50" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting}, {practitioner?.name?.split(" ")[0] ?? "Vaidya"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {practitioner?.practice_name ?? "Your practice"} ·{" "}
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4 space-y-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
              <s.icon className="size-4" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* AI Practice Overview */}
      <AiDashboardSummary />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Patients */}
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="font-medium text-sm">Recent Patients</h2>
            <button onClick={() => router.push("/patients")} className="text-xs text-primary hover:underline">
              View all
            </button>
          </div>
          <div className="divide-y">
            {patients.slice(0, 6).map((p) => (
              <div
                key={p.id}
                onClick={() => router.push(`/patients/${p.id}`)}
                className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 cursor-pointer transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
                  {p.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Added {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                  </p>
                </div>
                <DoshaBadge dosha={p.dosha_primary} />
              </div>
            ))}
            {patients.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No patients yet.{" "}
                <button onClick={() => router.push("/patients")} className="text-primary hover:underline">
                  Add your first patient
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Follow-ups */}
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="font-medium text-sm">Upcoming Follow-ups</h2>
            <button onClick={() => router.push("/followups")} className="text-xs text-primary hover:underline">
              View all
            </button>
          </div>
          <div className="divide-y">
            {upcomingFollowups.slice(0, 6).map((f) => (
              <div key={f.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.patient_name ?? "Patient"}</p>
                  <p className="text-xs text-muted-foreground truncate">{f.reason ?? "Follow-up"}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(f.scheduled_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
            {upcomingFollowups.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No upcoming follow-ups.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
