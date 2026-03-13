"use client";

import { useState, useCallback } from "react";
import { use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, ExternalLink, Save, FileText, Sparkles, Send, ChevronLeft, Loader2, TrendingUp, TrendingDown, Minus, Clock, Activity, Calendar, PersonStanding, Printer, Wind } from "lucide-react";
import { patientsApi, plansApi, checkinsApi, followupsApi, supplementsApi, recipesApi, notesApi, assessmentsApi, aiApi, yogaApi, planYogaApi, pranayamaApi, planPranayamaApi } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Badge, DoshaBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import DoshaAssessmentWizard from "@/components/dosha-assessment-wizard";
import DoshaRadarChart from "@/components/dosha-radar-chart";
import AiInsightsCard from "@/components/ai-insights-card";
import SortableAssignmentList, { type AssignmentItem } from "@/components/sortable-assignment-list";
import dynamic from "next/dynamic";
const PrintPatientPlan = dynamic(() => import("@/components/print-patient-plan"), { ssr: false });

type Tab = "overview" | "plan" | "checkins" | "followups" | "notes" | "assessment";

type Assessment = {
  id: number;
  patient_id: number;
  prakriti: { vata: number; pitta: number; kapha: number } | null;
  vikriti: { vata: number; pitta: number; kapha: number } | null;
  agni_type: string | null;
  ama_level: string | null;
  ashtavidha: Record<string, { finding?: string; notes?: string }> | null;
  result_prakriti: string | null;
  result_vikriti: string | null;
  notes: string | null;
  created_at: string;
};

const PORTAL_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(":8747", ":3747") ?? "http://localhost:3747";

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const patientId = parseInt(id);
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => patientsApi.get(patientId).then((r) => r.data),
  });

  const { data: plan } = useQuery({
    queryKey: ["plan", patientId],
    queryFn: () => plansApi.get(patientId).then((r) => r.data),
    enabled: tab === "plan" || tab === "overview",
    retry: false,
  });

  const { data: checkins = [] } = useQuery({
    queryKey: ["checkins", patientId],
    queryFn: () => checkinsApi.list(patientId).then((r) => r.data),
    enabled: tab === "checkins" || tab === "overview",
  });

  const { data: followups = [] } = useQuery({
    queryKey: ["patient-followups", patientId],
    queryFn: () => followupsApi.list({ patient_id: patientId }).then((r) => r.data),
    enabled: tab === "followups",
  });

  const { data: notes = [], refetch: refetchNotes } = useQuery({
    queryKey: ["patient-notes", patientId],
    queryFn: () => notesApi.list(patientId).then((r) => r.data),
    enabled: tab === "notes",
  });

  const { data: assessments = [] } = useQuery<Assessment[]>({
    queryKey: ["assessments", patientId],
    queryFn: () => assessmentsApi.list(patientId).then((r) => r.data),
    enabled: tab === "assessment",
  });
  const [showWizard, setShowWizard] = useState(false);

  // ── AI Plan Draft state ────────────────────────────────────────────────
  const [aiDraftPlan, setAiDraftPlan] = useState<Record<string, unknown> | null>(null);
  const [aiDraftPlanLoading, setAiDraftPlanLoading] = useState(false);

  // ── AI Assessment Interpretation state ──────────────────────────────────
  const [interpretations, setInterpretations] = useState<Record<number, Record<string, unknown>>>({});
  const [interpretLoading, setInterpretLoading] = useState<number | null>(null);

  // ── Notes state ─────────────────────────────────────────────────────────
  const [viewingNote, setViewingNote] = useState<Record<string, unknown> | null>(null);
  const [editingNote, setEditingNote] = useState<Record<string, string> | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSending, setNoteSending] = useState(false);

  const NOTE_SECTIONS = [
    { key: "greeting", label: "Greeting" },
    { key: "primary_concerns", label: "Primary Concerns" },
    { key: "health_history", label: "Health History & Context" },
    { key: "dietary_plan", label: "Dietary Plan" },
    { key: "lifestyle_plan", label: "Lifestyle & Routine" },
    { key: "supplements_plan", label: "Supplements" },
    { key: "emotional_wellbeing", label: "Emotional Wellbeing" },
    { key: "next_steps", label: "Next Steps" },
    { key: "custom_recipes", label: "Recipes & Preparations" },
    { key: "additional_notes", label: "Additional Notes" },
    { key: "closing", label: "Closing" },
  ];

  async function handleAiDraft() {
    setAiDrafting(true);
    try {
      const { data } = await notesApi.aiDraft(patientId);
      const draft = data.draft;
      setEditingNote({
        title: draft.title || "",
        greeting: draft.greeting || "",
        primary_concerns: draft.primary_concerns || "",
        health_history: draft.health_history || "",
        dietary_plan: draft.dietary_plan || "",
        lifestyle_plan: draft.lifestyle_plan || "",
        supplements_plan: draft.supplements_plan || "",
        emotional_wellbeing: draft.emotional_wellbeing || "",
        next_steps: draft.next_steps || "",
        custom_recipes: draft.custom_recipes || "",
        additional_notes: draft.additional_notes || "",
        closing: draft.closing || "",
      });
      setEditingNoteId(null);
    } catch {
      alert("Failed to generate AI draft. Please try again.");
    } finally {
      setAiDrafting(false);
    }
  }

  async function handleSaveNote() {
    if (!editingNote) return;
    setNoteSaving(true);
    try {
      if (editingNoteId) {
        await notesApi.update(patientId, editingNoteId, editingNote);
      } else {
        await notesApi.create(patientId, { ...editingNote, patient_id: patientId });
      }
      setEditingNote(null);
      setEditingNoteId(null);
      refetchNotes();
    } catch {
      alert("Failed to save note.");
    } finally {
      setNoteSaving(false);
    }
  }

  async function handleSendNote(noteId: number) {
    setNoteSending(true);
    try {
      await notesApi.send(patientId, noteId);
      refetchNotes();
    } catch {
      alert("Failed to send note.");
    } finally {
      setNoteSending(false);
    }
  }

  // ── Plan editor state ─────────────────────────────────────────────────────
  const [planEdits, setPlanEdits] = useState<Record<string, string>>({});
  const [addSupplementOpen, setAddSupplementOpen] = useState(false);
  const [addRecipeOpen, setAddRecipeOpen] = useState(false);
  const [suppSearch, setSuppSearch] = useState("");
  const [recipeSearch, setRecipeSearch] = useState("");
  const [newFollowupOpen, setNewFollowupOpen] = useState(false);
  const [followupForm, setFollowupForm] = useState({ scheduled_date: "", reason: "", notes: "" });

  // ── Yoga assignment (backend-powered) ──────────────────────────────────
  const [addYogaOpen, setAddYogaOpen] = useState(false);
  const [yogaSearch, setYogaSearch] = useState("");
  const [showPrint, setShowPrint] = useState(false);
  const [yogaConfigStep, setYogaConfigStep] = useState<{ id: number; name: string } | null>(null);
  const [yogaFields, setYogaFields] = useState<Record<string, string>>({});
  const [editYogaId, setEditYogaId] = useState<number | null>(null);
  const [editYogaFields, setEditYogaFields] = useState<Record<string, string>>({});

  // ── Pranayama assignment (backend-powered) ────────────────────────────
  const [addPranayamaOpen, setAddPranayamaOpen] = useState(false);
  const [pranayamaSearch, setPranayamaSearch] = useState("");
  const [pranayamaConfigStep, setPranayamaConfigStep] = useState<{ id: number; name: string } | null>(null);
  const [pranayamaFields, setPranayamaFields] = useState<Record<string, string>>({});
  const [editPranayamaId, setEditPranayamaId] = useState<number | null>(null);
  const [editPranayamaFields, setEditPranayamaFields] = useState<Record<string, string>>({});

  const { data: yogaLib = [] } = useQuery({
    queryKey: ["yoga-lib", yogaSearch],
    queryFn: () => yogaApi.list({ search: yogaSearch || undefined }).then((r) => r.data),
    enabled: addYogaOpen,
  });

  const { data: assignedYogaRaw = [] } = useQuery({
    queryKey: ["plan-yoga", plan?.id],
    queryFn: () => planYogaApi.list(plan.id).then((r) => r.data),
    enabled: !!plan?.id && (tab === "plan" || tab === "overview"),
  });

  const { data: pranayamaLib = [] } = useQuery({
    queryKey: ["pranayama-lib", pranayamaSearch],
    queryFn: () => pranayamaApi.list({ search: pranayamaSearch || undefined }).then((r) => r.data),
    enabled: addPranayamaOpen,
  });

  const { data: assignedPranayamaRaw = [] } = useQuery({
    queryKey: ["plan-pranayama", plan?.id],
    queryFn: () => planPranayamaApi.list(plan.id).then((r) => r.data),
    enabled: !!plan?.id && (tab === "plan" || tab === "overview"),
  });

  const { data: suppLib = [] } = useQuery({
    queryKey: ["supplements-lib", suppSearch],
    queryFn: () => supplementsApi.list({ search: suppSearch || undefined }).then((r) => r.data),
    enabled: addSupplementOpen,
  });

  const { data: recipeLib = [] } = useQuery({
    queryKey: ["recipes-lib", recipeSearch],
    queryFn: () => recipesApi.list({ search: recipeSearch || undefined }).then((r) => r.data),
    enabled: addRecipeOpen,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createPlanMutation = useMutation({
    mutationFn: () => plansApi.create(patientId, { title: "Initial Protocol" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan", patientId] }),
  });

  const updatePlanMutation = useMutation({
    mutationFn: (data: Record<string, string>) => plansApi.update(patientId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan", patientId] });
      setPlanEdits({});
    },
  });

  const addSupplementMutation = useMutation({
    mutationFn: (supplementId: number) =>
      plansApi.addSupplement(patientId, { supplement_id: supplementId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan", patientId] });
      setAddSupplementOpen(false);
    },
  });

  const removeSupplementMutation = useMutation({
    mutationFn: (psId: number) => plansApi.removeSupplement(psId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan", patientId] }),
  });

  const addRecipeMutation = useMutation({
    mutationFn: (recipeId: number) =>
      plansApi.addRecipe(patientId, { recipe_id: recipeId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan", patientId] });
      setAddRecipeOpen(false);
    },
  });

  const removeRecipeMutation = useMutation({
    mutationFn: (prId: number) => plansApi.removeRecipe(prId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan", patientId] }),
  });

  const addYogaMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      planYogaApi.assign(plan.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan-yoga", plan?.id] });
      setAddYogaOpen(false);
      setYogaConfigStep(null);
      setYogaFields({});
    },
  });

  const updateYogaMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, string> }) =>
      planYogaApi.update(plan.id, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan-yoga", plan?.id] });
      setEditYogaId(null);
    },
  });

  const removeYogaMutation = useMutation({
    mutationFn: (assignmentId: number) => planYogaApi.remove(plan.id, assignmentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan-yoga", plan?.id] }),
  });

  const reorderYogaMutation = useMutation({
    mutationFn: (ids: number[]) => planYogaApi.reorder(plan.id, ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan-yoga", plan?.id] }),
  });

  const addPranayamaMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      planPranayamaApi.assign(plan.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan-pranayama", plan?.id] });
      setAddPranayamaOpen(false);
      setPranayamaConfigStep(null);
      setPranayamaFields({});
    },
  });

  const updatePranayamaMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, string> }) =>
      planPranayamaApi.update(plan.id, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan-pranayama", plan?.id] });
      setEditPranayamaId(null);
    },
  });

  const removePranayamaMutation = useMutation({
    mutationFn: (assignmentId: number) => planPranayamaApi.remove(plan.id, assignmentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan-pranayama", plan?.id] }),
  });

  const reorderPranayamaMutation = useMutation({
    mutationFn: (ids: number[]) => planPranayamaApi.reorder(plan.id, ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan-pranayama", plan?.id] }),
  });

  // ── Assignment item mappers ─────────────────────────────────────────────
  const yogaItems: AssignmentItem[] = assignedYogaRaw.map((y: { id: number; asana_id: number; frequency?: string | null; duration?: string | null; practice_time?: string | null; notes?: string | null; asana?: { name: string; name_sanskrit?: string | null; level?: string | null; hold_duration?: string | null } | null }) => ({
    id: y.id,
    title: y.asana?.name ?? `Asana #${y.asana_id}`,
    subtitle: y.asana?.name_sanskrit,
    badges: [y.asana?.level].filter(Boolean) as string[],
    meta: [y.frequency, y.duration, y.practice_time].filter(Boolean).join(" · "),
    notes: y.notes,
  }));

  const pranayamaItems: AssignmentItem[] = assignedPranayamaRaw.map((p: { id: number; pranayama_id: number; frequency?: string | null; duration?: string | null; rounds?: string | null; practice_time?: string | null; notes?: string | null; pranayama?: { name: string; name_sanskrit?: string | null; category?: string | null; difficulty?: string | null } | null }) => ({
    id: p.id,
    title: p.pranayama?.name ?? `Exercise #${p.pranayama_id}`,
    subtitle: p.pranayama?.name_sanskrit,
    badges: [p.pranayama?.difficulty, p.pranayama?.category].filter(Boolean) as string[],
    meta: [p.frequency, p.duration, p.rounds, p.practice_time].filter(Boolean).join(" · "),
    notes: p.notes,
  }));

  const handleEditYoga = useCallback((assignmentId: number) => {
    const item = assignedYogaRaw.find((y: { id: number }) => y.id === assignmentId);
    if (!item) return;
    setEditYogaFields({
      frequency: item.frequency || "",
      duration: item.duration || "",
      hold_time: item.hold_time || "",
      repetitions: item.repetitions || "",
      practice_time: item.practice_time || "",
      notes: item.notes || "",
    });
    setEditYogaId(assignmentId);
  }, [assignedYogaRaw]);

  const handleEditPranayama = useCallback((assignmentId: number) => {
    const item = assignedPranayamaRaw.find((p: { id: number }) => p.id === assignmentId);
    if (!item) return;
    setEditPranayamaFields({
      frequency: item.frequency || "",
      duration: item.duration || "",
      rounds: item.rounds || "",
      practice_time: item.practice_time || "",
      notes: item.notes || "",
    });
    setEditPranayamaId(assignmentId);
  }, [assignedPranayamaRaw]);

  const addFollowupMutation = useMutation({
    mutationFn: () => followupsApi.create({ ...followupForm, patient_id: patientId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient-followups", patientId] });
      qc.invalidateQueries({ queryKey: ["followups", "upcoming"] });
      setNewFollowupOpen(false);
      setFollowupForm({ scheduled_date: "", reason: "", notes: "" });
    },
  });

  const completeFollowupMutation = useMutation({
    mutationFn: (id: number) => followupsApi.update(id, { completed: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patient-followups", patientId] }),
  });

  if (isLoading || !patient) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "assessment", label: "Assessment" },
    { id: "plan", label: "Care Plan" },
    { id: "notes", label: "Notes" },
    { id: "checkins", label: "Check-ins" },
    { id: "followups", label: "Follow-ups" },
  ];

  const planFields = [
    { key: "foods_to_include", label: "Foods to Include" },
    { key: "foods_to_avoid", label: "Foods to Avoid" },
    { key: "lifestyle_notes", label: "Lifestyle" },
    { key: "breathing_notes", label: "Breathing / Pranayama" },
    { key: "nasal_care_notes", label: "Nasal Care (Nasya)" },
    { key: "followup_notes", label: "Follow-up Notes" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b bg-card">
        <button
          onClick={() => router.push("/patients")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary text-sm font-semibold shrink-0">
            {patient.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="font-semibold truncate">{patient.full_name}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              {patient.dob && (
                <span className="text-xs text-muted-foreground">
                  {Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 86400000))}y
                  {patient.sex ? ` · ${patient.sex}` : ""}
                </span>
              )}
              <DoshaBadge dosha={patient.dosha_primary} />
            </div>
          </div>
        </div>
        {patient.portal_token && (
          <a
            href={`${PORTAL_BASE}/portal/${patient.portal_token}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
              <ExternalLink className="size-3.5" />
              Portal
            </Button>
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b bg-card px-6 shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* ── Overview ────────────────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="max-w-3xl space-y-6">
            {/* Health KPI Dashboard */}
            {(() => {
              const recentCheckins = (checkins as Array<{ habit_completion_pct: number; avg_symptom_score?: number; date: string }>).slice(0, 7);
              const avgCompliance = recentCheckins.length > 0
                ? recentCheckins.reduce((s, c) => s + c.habit_completion_pct, 0) / recentCheckins.length : null;

              // Symptom trend: first 3 vs last 3
              const allCheckins = checkins as Array<{ avg_symptom_score?: number; date: string }>;
              let trendDelta: number | null = null;
              if (allCheckins.length >= 6) {
                const first3 = allCheckins.slice(-3).map(c => c.avg_symptom_score ?? 0);
                const last3 = allCheckins.slice(0, 3).map(c => c.avg_symptom_score ?? 0);
                const avgFirst = first3.reduce((s, v) => s + v, 0) / 3;
                const avgLast = last3.reduce((s, v) => s + v, 0) / 3;
                trendDelta = avgLast - avgFirst;
              }

              const daysOnPlan = plan?.start_date
                ? Math.floor((Date.now() - new Date(plan.start_date).getTime()) / 86400000)
                : null;

              const lastCheckinDate = allCheckins.length > 0 ? allCheckins[0].date : null;

              if (!avgCompliance && !daysOnPlan && !lastCheckinDate) return null;

              return (
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Compliance */}
                  <div className="rounded-xl border bg-card p-4 flex flex-col items-center gap-2">
                    <div className="relative w-14 h-14">
                      <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                        <circle
                          cx="18" cy="18" r="15.5" fill="none"
                          stroke={avgCompliance != null ? (avgCompliance >= 75 ? "#10b981" : avgCompliance >= 50 ? "#f59e0b" : "#ef4444") : "#e5e7eb"}
                          strokeWidth="3"
                          strokeDasharray={`${(avgCompliance ?? 0) * 0.9738} 97.38`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                        {avgCompliance != null ? `${Math.round(avgCompliance)}%` : "—"}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center">Compliance</p>
                  </div>

                  {/* Symptom Trend */}
                  <div className="rounded-xl border bg-card p-4 flex flex-col items-center justify-center gap-1">
                    {trendDelta != null ? (
                      <>
                        {trendDelta > 0.3 ? (
                          <TrendingUp className="size-7 text-emerald-500" />
                        ) : trendDelta < -0.3 ? (
                          <TrendingDown className="size-7 text-red-500" />
                        ) : (
                          <Minus className="size-7 text-amber-500" />
                        )}
                        <span className={cn("text-sm font-semibold",
                          trendDelta > 0.3 ? "text-emerald-600" : trendDelta < -0.3 ? "text-red-600" : "text-amber-600"
                        )}>
                          {trendDelta > 0 ? "+" : ""}{trendDelta.toFixed(1)}
                        </span>
                      </>
                    ) : (
                      <Activity className="size-7 text-muted-foreground/40" />
                    )}
                    <p className="text-[10px] text-muted-foreground text-center">Symptom Trend</p>
                  </div>

                  {/* Days on Protocol */}
                  <div className="rounded-xl border bg-card p-4 flex flex-col items-center justify-center gap-1">
                    <Calendar className="size-5 text-primary/60 mb-0.5" />
                    <span className="text-lg font-semibold">{daysOnPlan ?? "—"}</span>
                    <p className="text-[10px] text-muted-foreground text-center">
                      {daysOnPlan != null ? "Days on Protocol" : "No Active Plan"}
                    </p>
                  </div>

                  {/* Last Check-in */}
                  <div className="rounded-xl border bg-card p-4 flex flex-col items-center justify-center gap-1">
                    <Clock className="size-5 text-primary/60 mb-0.5" />
                    <span className="text-xs font-medium text-center">
                      {lastCheckinDate
                        ? new Date(lastCheckinDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                        : "—"}
                    </span>
                    <p className="text-[10px] text-muted-foreground text-center">Last Check-in</p>
                  </div>
                </section>
              );
            })()}

            {/* AI Insights */}
            <AiInsightsCard patientId={patientId} />

            <section className="rounded-xl border bg-card p-5 space-y-4">
              <h2 className="font-medium text-sm">Demographics</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: "Email", value: patient.email },
                  { label: "Phone", value: patient.phone },
                  { label: "Location", value: patient.location },
                  { label: "Occupation", value: patient.occupation },
                  { label: "Weight", value: patient.weight_lbs ? `${patient.weight_lbs} lbs` : null },
                  { label: "Height", value: patient.height_in ? `${Math.floor(patient.height_in / 12)}′${Math.round(patient.height_in % 12)}″` : null },
                  { label: "Diet Pattern", value: patient.diet_pattern },
                  { label: "Stress Level", value: patient.stress_level },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-0.5">{value ?? "—"}</p>
                  </div>
                ))}
              </div>
            </section>

            {patient.health_profile && (
              <section className="rounded-xl border bg-card p-5 space-y-4">
                <h2 className="font-medium text-sm">Ayurvedic Assessment</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    { label: "Primary Dosha", value: patient.health_profile.dosha_primary },
                    { label: "Secondary Dosha", value: patient.health_profile.dosha_secondary },
                    { label: "Dosha Imbalances", value: patient.health_profile.dosha_imbalances },
                    { label: "Agni", value: patient.health_profile.agni_assessment },
                    { label: "Ama", value: patient.health_profile.ama_assessment },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="mt-0.5">{value ?? "—"}</p>
                    </div>
                  ))}
                </div>
                {patient.health_profile.chief_complaints && (
                  <div>
                    <p className="text-xs text-muted-foreground">Chief Complaints</p>
                    <p className="mt-0.5 text-sm whitespace-pre-wrap">{patient.health_profile.chief_complaints}</p>
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {/* ── Assessment ────────────────────────────────────────────────── */}
        {tab === "assessment" && (
          <div className="max-w-3xl space-y-5">
            {showWizard ? (
              <DoshaAssessmentWizard
                patientId={patientId}
                onComplete={() => setShowWizard(false)}
                onCancel={() => setShowWizard(false)}
              />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-medium">Dosha Assessments</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {assessments.length} assessment{assessments.length !== 1 ? "s" : ""} on file
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setShowWizard(true)} className="gap-1.5">
                    <Plus className="size-3.5" /> New Assessment
                  </Button>
                </div>

                {assessments.length === 0 ? (
                  <div className="rounded-xl border bg-card p-8 text-center space-y-3">
                    <p className="text-sm text-muted-foreground">No dosha assessments yet.</p>
                    <p className="text-xs text-muted-foreground">Run a structured Prakriti/Vikriti assessment to establish the patient&apos;s constitutional profile.</p>
                    <Button size="sm" onClick={() => setShowWizard(true)}>Start Assessment</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assessments.map((a) => {
                      const { prakriti, vikriti } = a;
                      return (
                        <div key={a.id} className="rounded-xl border bg-card p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              {new Date(a.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                            </p>
                          </div>

                          {/* Dosha Radar Chart */}
                          <DoshaRadarChart prakriti={prakriti} vikriti={vikriti} />

                          <div className="grid grid-cols-2 gap-4">
                            {/* Prakriti */}
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prakriti</p>
                              <p className="text-xl font-semibold text-primary">{a.result_prakriti || "—"}</p>
                              {prakriti && (
                                <div className="space-y-1">
                                  <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
                                    {(() => {
                                      const total = prakriti.vata + prakriti.pitta + prakriti.kapha;
                                      if (total === 0) return null;
                                      return (
                                        <>
                                          <div className="bg-sky-500" style={{ width: `${(prakriti.vata / total) * 100}%` }} />
                                          <div className="bg-orange-500" style={{ width: `${(prakriti.pitta / total) * 100}%` }} />
                                          <div className="bg-emerald-500" style={{ width: `${(prakriti.kapha / total) * 100}%` }} />
                                        </>
                                      );
                                    })()}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">
                                    V:{prakriti.vata} · P:{prakriti.pitta} · K:{prakriti.kapha}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Vikriti */}
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vikriti</p>
                              <p className="text-xl font-semibold text-primary">{a.result_vikriti || "—"}</p>
                              {vikriti && (vikriti.vata > 0 || vikriti.pitta > 0 || vikriti.kapha > 0) && (
                                <div className="space-y-1">
                                  <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
                                    {(() => {
                                      const total = vikriti.vata + vikriti.pitta + vikriti.kapha;
                                      if (total === 0) return null;
                                      return (
                                        <>
                                          <div className="bg-sky-500" style={{ width: `${(vikriti.vata / total) * 100}%` }} />
                                          <div className="bg-orange-500" style={{ width: `${(vikriti.pitta / total) * 100}%` }} />
                                          <div className="bg-emerald-500" style={{ width: `${(vikriti.kapha / total) * 100}%` }} />
                                        </>
                                      );
                                    })()}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">
                                    V:{vikriti.vata} · P:{vikriti.pitta} · K:{vikriti.kapha}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Agni & Ama row */}
                          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                            <div>
                              <p className="text-xs text-muted-foreground">Agni</p>
                              <p className="text-sm font-medium">{a.agni_type || "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Ama</p>
                              <p className="text-sm font-medium">{a.ama_level || "—"}</p>
                            </div>
                          </div>

                          {/* Ashtavidha summary */}
                          {a.ashtavidha && Object.keys(a.ashtavidha).length > 0 && (
                            <div className="pt-2 border-t">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">8-Fold Exam</p>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                {Object.entries(a.ashtavidha).map(([key, val]) => (
                                  val?.finding ? (
                                    <div key={key}>
                                      <span className="text-xs text-muted-foreground capitalize">{key}: </span>
                                      <span className="text-xs">{val.finding}</span>
                                    </div>
                                  ) : null
                                ))}
                              </div>
                            </div>
                          )}

                          {a.notes && (
                            <div className="pt-2 border-t">
                              <p className="text-xs text-muted-foreground">Notes</p>
                              <p className="text-sm whitespace-pre-wrap">{a.notes}</p>
                            </div>
                          )}

                          {/* AI Interpretation */}
                          <div className="pt-2 border-t">
                            {!interpretations[a.id] && interpretLoading !== a.id && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                onClick={async () => {
                                  setInterpretLoading(a.id);
                                  try {
                                    const res = await aiApi.interpretAssessment(a.id);
                                    setInterpretations((prev) => ({ ...prev, [a.id]: res.data.interpretation }));
                                  } catch {
                                    // silently fail
                                  } finally {
                                    setInterpretLoading(null);
                                  }
                                }}
                              >
                                <Sparkles className="size-3.5" /> AI Interpretation
                              </Button>
                            )}
                            {interpretLoading === a.id && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                <Loader2 className="size-4 animate-spin" /> Generating clinical interpretation...
                              </div>
                            )}
                            {interpretations[a.id] && (
                              <div className="space-y-3 bg-gradient-to-br from-amber-50/60 to-orange-50/40 rounded-lg p-4">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
                                  <Sparkles className="size-3" /> AI Clinical Interpretation
                                </div>
                                {[
                                  { key: "constitution_summary", label: "Constitution" },
                                  { key: "imbalance_analysis", label: "Imbalance Analysis" },
                                  { key: "clinical_observations", label: "Clinical Observations" },
                                  { key: "dietary_direction", label: "Dietary Direction" },
                                  { key: "lifestyle_direction", label: "Lifestyle Direction" },
                                ].map(({ key, label }) => {
                                  const val = interpretations[a.id][key];
                                  if (!val) return null;
                                  return (
                                    <div key={key}>
                                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
                                      <p className="text-sm leading-relaxed">{val as string}</p>
                                    </div>
                                  );
                                })}
                                {Array.isArray(interpretations[a.id].protocol_suggestions) && (
                                  <div>
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Protocol Suggestions</p>
                                    <ul className="text-sm space-y-1 list-disc list-inside">
                                      {(interpretations[a.id].protocol_suggestions as string[]).map((s, i) => (
                                        <li key={i}>{s}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Care Plan ────────────────────────────────────────────────── */}
        {tab === "plan" && (
          <div className="max-w-3xl space-y-5">
            {!plan ? (
              <div className="rounded-xl border bg-card p-8 text-center space-y-4">
                <p className="text-muted-foreground text-sm">No active care plan.</p>
                <div className="flex items-center justify-center gap-3">
                  <Button onClick={() => createPlanMutation.mutate()} disabled={createPlanMutation.isPending}>
                    {createPlanMutation.isPending ? "Creating…" : "Create Blank Protocol"}
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    disabled={aiDraftPlanLoading}
                    onClick={async () => {
                      setAiDraftPlanLoading(true);
                      try {
                        const res = await aiApi.draftPlan(patientId);
                        setAiDraftPlan(res.data.draft);
                      } catch { /* ignore */ }
                      finally { setAiDraftPlanLoading(false); }
                    }}
                  >
                    <Sparkles className="size-4" />
                    {aiDraftPlanLoading ? "Generating…" : "Generate with AI"}
                  </Button>
                </div>
                {aiDraftPlanLoading && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> AI is analyzing the patient profile...
                  </div>
                )}
                {aiDraftPlan && (
                  <div className="text-left rounded-xl border bg-gradient-to-br from-amber-50/60 to-orange-50/40 p-5 space-y-4 mt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-4 text-primary" />
                        <h3 className="font-medium text-sm">AI-Generated Draft</h3>
                      </div>
                      <Button
                        size="sm"
                        onClick={async () => {
                          await createPlanMutation.mutateAsync();
                          // After plan is created, apply AI draft fields
                          const updates: Record<string, string> = {};
                          const fields = ["title", "foods_to_include", "foods_to_avoid", "lifestyle_notes", "breathing_notes", "nasal_care_notes", "followup_notes"];
                          fields.forEach((f) => {
                            if (aiDraftPlan[f]) updates[f] = aiDraftPlan[f] as string;
                          });
                          if (aiDraftPlan.duration_weeks) updates.duration_weeks = String(aiDraftPlan.duration_weeks);
                          setPlanEdits(updates);
                          setAiDraftPlan(null);
                        }}
                      >
                        Apply to Plan
                      </Button>
                    </div>
                    <p className="text-sm font-semibold">{String(aiDraftPlan.title ?? "")}</p>
                    {aiDraftPlan.rationale ? <p className="text-sm text-muted-foreground italic">{String(aiDraftPlan.rationale)}</p> : null}
                    {[
                      { key: "foods_to_include", label: "Foods to Include" },
                      { key: "foods_to_avoid", label: "Foods to Avoid" },
                      { key: "lifestyle_notes", label: "Lifestyle" },
                      { key: "breathing_notes", label: "Breathing" },
                      { key: "followup_notes", label: "Follow-up" },
                    ].map(({ key, label }) => {
                      const val = aiDraftPlan[key];
                      if (!val) return null;
                      return (
                        <div key={key}>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
                          <p className="text-sm whitespace-pre-wrap">{String(val)}</p>
                        </div>
                      );
                    })}
                    {Array.isArray(aiDraftPlan.supplements) && (aiDraftPlan.supplements as Array<Record<string, string>>).length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Suggested Supplements</p>
                        <ul className="text-sm space-y-1 list-disc list-inside">
                          {(aiDraftPlan.supplements as Array<Record<string, string>>).map((s, i) => (
                            <li key={i}>{s.name} — {s.dose}, {s.frequency}. {s.purpose}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">{plan.title}</h2>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => setShowPrint(true)}
                    >
                      <Printer className="size-3.5" />
                      Print
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      disabled={aiDraftPlanLoading}
                      onClick={async () => {
                        setAiDraftPlanLoading(true);
                        try {
                          const res = await aiApi.draftPlan(patientId);
                          const draft = res.data.draft;
                          const updates: Record<string, string> = {};
                          ["title", "foods_to_include", "foods_to_avoid", "lifestyle_notes", "breathing_notes", "nasal_care_notes", "followup_notes"].forEach((f) => {
                            if (draft[f]) updates[f] = draft[f];
                          });
                          setPlanEdits(updates);
                        } catch { /* ignore */ }
                        finally { setAiDraftPlanLoading(false); }
                      }}
                    >
                      <Sparkles className="size-3.5" />
                      {aiDraftPlanLoading ? "Generating…" : "AI Rewrite"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => updatePlanMutation.mutate(planEdits)}
                      disabled={Object.keys(planEdits).length === 0 || updatePlanMutation.isPending}
                      className="gap-1.5"
                    >
                      <Save className="size-3.5" />
                      {updatePlanMutation.isPending ? "Saving…" : "Save Changes"}
                    </Button>
                  </div>
                </div>

                {/* Plan text fields */}
                <div className="rounded-xl border bg-card p-5 space-y-4">
                  <div className="grid gap-4">
                    {planFields.map(({ key, label }) => (
                      <div key={key} className="space-y-1.5">
                        <Label>{label}</Label>
                        <Textarea
                          rows={2}
                          value={planEdits[key] ?? plan[key] ?? ""}
                          onChange={(e) => setPlanEdits((prev) => ({ ...prev, [key]: e.target.value }))}
                          placeholder={`Enter ${label.toLowerCase()}…`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Supplements */}
                <div className="rounded-xl border bg-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm">Supplements ({plan.supplements?.length ?? 0})</h3>
                    <Button size="sm" variant="outline" onClick={() => setAddSupplementOpen(true)} className="gap-1.5">
                      <Plus className="size-3.5" /> Add
                    </Button>
                  </div>
                  {plan.supplements?.length === 0 && (
                    <p className="text-sm text-muted-foreground">No supplements added yet.</p>
                  )}
                  <div className="space-y-2">
                    {plan.supplements?.map((s: { id: number; name: string; name_sanskrit?: string; dose?: string; timing?: string }) => (
                      <div key={s.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{s.name}</p>
                          {s.name_sanskrit && <p className="text-xs text-muted-foreground italic">{s.name_sanskrit}</p>}
                          {(s.dose || s.timing) && (
                            <p className="text-xs text-muted-foreground">{[s.dose, s.timing].filter(Boolean).join(" · ")}</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeSupplementMutation.mutate(s.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recipes */}
                <div className="rounded-xl border bg-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm">Recipes ({plan.recipes?.length ?? 0})</h3>
                    <Button size="sm" variant="outline" onClick={() => setAddRecipeOpen(true)} className="gap-1.5">
                      <Plus className="size-3.5" /> Add
                    </Button>
                  </div>
                  {plan.recipes?.length === 0 && (
                    <p className="text-sm text-muted-foreground">No recipes added yet.</p>
                  )}
                  <div className="space-y-2">
                    {plan.recipes?.map((r: { id: number; name: string; meal_type?: string; meal_slot?: string }) => (
                      <div key={r.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{r.name}</p>
                          {(r.meal_type || r.meal_slot) && (
                            <p className="text-xs text-muted-foreground">{[r.meal_type, r.meal_slot].filter(Boolean).join(" · ")}</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeRecipeMutation.mutate(r.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Yoga */}
                <div className="rounded-xl border bg-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm flex items-center gap-1.5">
                      <PersonStanding className="size-4" />
                      Yoga ({assignedYogaRaw.length})
                    </h3>
                    <Button size="sm" variant="outline" onClick={() => setAddYogaOpen(true)} className="gap-1.5">
                      <Plus className="size-3.5" /> Add
                    </Button>
                  </div>
                  {assignedYogaRaw.length === 0 && (
                    <p className="text-sm text-muted-foreground">No yoga asanas assigned yet.</p>
                  )}
                  <SortableAssignmentList
                    items={yogaItems}
                    onReorder={(ids) => reorderYogaMutation.mutate(ids)}
                    onEdit={handleEditYoga}
                    onRemove={(id) => removeYogaMutation.mutate(id)}
                  />
                </div>

                {/* Pranayama */}
                <div className="rounded-xl border bg-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm flex items-center gap-1.5">
                      <Wind className="size-4" />
                      Pranayama ({assignedPranayamaRaw.length})
                    </h3>
                    <Button size="sm" variant="outline" onClick={() => setAddPranayamaOpen(true)} className="gap-1.5">
                      <Plus className="size-3.5" /> Add
                    </Button>
                  </div>
                  {assignedPranayamaRaw.length === 0 && (
                    <p className="text-sm text-muted-foreground">No pranayama exercises assigned yet.</p>
                  )}
                  <SortableAssignmentList
                    items={pranayamaItems}
                    onReorder={(ids) => reorderPranayamaMutation.mutate(ids)}
                    onEdit={handleEditPranayama}
                    onRemove={(id) => removePranayamaMutation.mutate(id)}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Check-ins ────────────────────────────────────────────────── */}
        {tab === "checkins" && (
          <div className="max-w-4xl space-y-4">
            <h2 className="font-medium text-sm text-muted-foreground">Last 30 check-ins</h2>
            {checkins.length === 0 ? (
              <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
                No check-ins yet. Share the portal link with the patient.
              </div>
            ) : (
              <div className="rounded-xl border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Habits</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Digestion</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Energy</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {checkins.map((c: {
                      id: number;
                      date: string;
                      habit_completion_pct: number;
                      digestion_score?: number;
                      energy_score?: number;
                      avg_symptom_score?: number;
                    }) => (
                      <tr key={c.id}>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${c.habit_completion_pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{Math.round(c.habit_completion_pct)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {c.digestion_score ? (
                            <span className={cn("font-medium", c.digestion_score >= 4 ? "text-emerald-600" : c.digestion_score <= 2 ? "text-red-500" : "")}>
                              {c.digestion_score}/5
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {c.energy_score ? (
                            <span className={cn("font-medium", c.energy_score >= 4 ? "text-emerald-600" : c.energy_score <= 2 ? "text-red-500" : "")}>
                              {c.energy_score}/5
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {c.avg_symptom_score != null ? (
                            <Badge variant={c.avg_symptom_score >= 4 ? "success" : c.avg_symptom_score <= 2 ? "destructive" : "secondary"}>
                              {c.avg_symptom_score.toFixed(1)}
                            </Badge>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Notes ────────────────────────────────────────────────────── */}
        {tab === "notes" && (
          <div className="max-w-3xl space-y-4">
            {/* Viewing a single note */}
            {viewingNote && !editingNote ? (
              <div className="space-y-4">
                <button
                  onClick={() => setViewingNote(null)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="size-3.5" /> Back to notes
                </button>
                <div className="rounded-xl border bg-card p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">{viewingNote.title as string}</h2>
                    <div className="flex items-center gap-2">
                      {!(viewingNote.sent as boolean) && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const noteData: Record<string, string> = { title: (viewingNote.title as string) || "" };
                              NOTE_SECTIONS.forEach(({ key }) => {
                                noteData[key] = (viewingNote[key] as string) || "";
                              });
                              setEditingNote(noteData);
                              setEditingNoteId(viewingNote.id as number);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            className="gap-1.5"
                            disabled={noteSending}
                            onClick={() => handleSendNote(viewingNote.id as number)}
                          >
                            <Send className="size-3.5" />
                            {noteSending ? "Sending..." : "Send to Patient"}
                          </Button>
                        </>
                      )}
                      {(viewingNote.sent as boolean) && (
                        <Badge variant="success">Sent {viewingNote.sent_at ? new Date(viewingNote.sent_at as string).toLocaleDateString() : ""}</Badge>
                      )}
                    </div>
                  </div>
                  {NOTE_SECTIONS.map(({ key, label }) => {
                    const val = viewingNote[key] as string | null;
                    if (!val) return null;
                    return (
                      <div key={key}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{val}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : editingNote ? (
              /* Editing / creating a note */
              <div className="space-y-4">
                <button
                  onClick={() => { setEditingNote(null); setEditingNoteId(null); }}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="size-3.5" /> Cancel
                </button>
                <div className="rounded-xl border bg-card p-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label>Title *</Label>
                    <Input
                      value={editingNote.title || ""}
                      onChange={(e) => setEditingNote((prev) => prev ? { ...prev, title: e.target.value } : prev)}
                      placeholder="e.g. Initial Consultation — 2-Month Support Plan"
                    />
                  </div>
                  {NOTE_SECTIONS.map(({ key, label }) => (
                    <div key={key} className="space-y-1.5">
                      <Label>{label}</Label>
                      <Textarea
                        rows={key === "dietary_plan" || key === "custom_recipes" || key === "next_steps" ? 6 : 3}
                        value={editingNote[key] || ""}
                        onChange={(e) => setEditingNote((prev) => prev ? { ...prev, [key]: e.target.value } : prev)}
                        placeholder={`Enter ${label.toLowerCase()}...`}
                      />
                    </div>
                  ))}
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" onClick={() => { setEditingNote(null); setEditingNoteId(null); }}>
                      Cancel
                    </Button>
                    <Button disabled={noteSaving || !editingNote.title} onClick={handleSaveNote}>
                      {noteSaving ? "Saving..." : editingNoteId ? "Update Note" : "Save Note"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Notes list */
              <>
                <div className="flex items-center justify-between">
                  <h2 className="font-medium text-sm text-muted-foreground">Consultation Notes ({notes.length})</h2>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      disabled={aiDrafting}
                      onClick={handleAiDraft}
                    >
                      <Sparkles className="size-3.5" />
                      {aiDrafting ? "Generating..." : "AI Draft"}
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        setEditingNote({ title: "", greeting: "", primary_concerns: "", health_history: "", dietary_plan: "", lifestyle_plan: "", supplements_plan: "", emotional_wellbeing: "", next_steps: "", custom_recipes: "", additional_notes: "", closing: "" });
                        setEditingNoteId(null);
                      }}
                    >
                      <Plus className="size-3.5" /> New Note
                    </Button>
                  </div>
                </div>
                {aiDrafting && (
                  <div className="rounded-xl border bg-card p-8 text-center space-y-3">
                    <Loader2 className="size-6 text-primary animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground">Analyzing patient profile, care plan, and check-in history...</p>
                    <p className="text-xs text-muted-foreground">Generating a structured consultation note with AI</p>
                  </div>
                )}
                {notes.length === 0 && !aiDrafting ? (
                  <div className="rounded-xl border bg-card p-8 text-center space-y-3">
                    <FileText className="size-8 text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">No consultation notes yet.</p>
                    <p className="text-xs text-muted-foreground">Create a new note manually or use AI to draft one from the patient&apos;s profile.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notes.map((n: { id: number; title: string; sent: boolean; sent_at?: string; created_at: string; primary_concerns?: string }) => (
                      <button
                        key={n.id}
                        onClick={() => setViewingNote(n)}
                        className="w-full text-left rounded-xl border bg-card p-4 hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="size-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{n.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(n.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                              </p>
                            </div>
                          </div>
                          {n.sent ? (
                            <Badge variant="success" className="shrink-0">Sent</Badge>
                          ) : (
                            <Badge variant="secondary" className="shrink-0">Draft</Badge>
                          )}
                        </div>
                        {n.primary_concerns && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2 pl-7">{n.primary_concerns}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Follow-ups ────────────────────────────────────────────────── */}
        {tab === "followups" && (
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-sm text-muted-foreground">Follow-ups</h2>
              <Button size="sm" onClick={() => setNewFollowupOpen(true)} className="gap-1.5">
                <Plus className="size-3.5" /> Schedule
              </Button>
            </div>
            {followups.length === 0 ? (
              <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
                No follow-ups scheduled.
              </div>
            ) : (
              <div className="space-y-2">
                {followups.map((f: { id: number; scheduled_date: string; reason?: string; notes?: string; completed_at?: string }) => (
                  <div key={f.id} className="rounded-xl border bg-card p-4 flex items-start gap-4">
                    <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", f.completed_at ? "bg-muted-foreground" : "bg-primary")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {new Date(f.scheduled_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                      </p>
                      {f.reason && <p className="text-sm text-muted-foreground">{f.reason}</p>}
                      {f.notes && <p className="text-xs text-muted-foreground mt-1">{f.notes}</p>}
                    </div>
                    {!f.completed_at && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => completeFollowupMutation.mutate(f.id)}
                        disabled={completeFollowupMutation.isPending}
                      >
                        Complete
                      </Button>
                    )}
                    {f.completed_at && (
                      <Badge variant="success">Done</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}

      {/* Add Supplement */}
      <Dialog open={addSupplementOpen} onClose={() => setAddSupplementOpen(false)} title="Add Supplement" className="max-w-lg">
        <div className="space-y-3">
          <Input placeholder="Search supplements…" value={suppSearch} onChange={(e) => setSuppSearch(e.target.value)} />
          <div className="max-h-72 overflow-y-auto space-y-1.5 -mx-1 px-1">
            {suppLib.map((s: { id: number; name: string; name_sanskrit?: string; dosha_effect?: string; typical_dose?: string }) => (
              <button
                key={s.id}
                onClick={() => addSupplementMutation.mutate(s.id)}
                disabled={addSupplementMutation.isPending}
                className="w-full text-left rounded-lg border px-3 py-2.5 hover:bg-muted/50 transition-colors"
              >
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[s.name_sanskrit, s.dosha_effect, s.typical_dose].filter(Boolean).join(" · ")}
                </p>
              </button>
            ))}
          </div>
        </div>
      </Dialog>

      {/* Add Recipe */}
      <Dialog open={addRecipeOpen} onClose={() => setAddRecipeOpen(false)} title="Add Recipe" className="max-w-lg">
        <div className="space-y-3">
          <Input placeholder="Search recipes…" value={recipeSearch} onChange={(e) => setRecipeSearch(e.target.value)} />
          <div className="max-h-72 overflow-y-auto space-y-1.5 -mx-1 px-1">
            {recipeLib.map((r: { id: number; name: string; meal_type?: string; dosha_good_for?: string }) => (
              <button
                key={r.id}
                onClick={() => addRecipeMutation.mutate(r.id)}
                disabled={addRecipeMutation.isPending}
                className="w-full text-left rounded-lg border px-3 py-2.5 hover:bg-muted/50 transition-colors"
              >
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[r.meal_type, r.dosha_good_for ? `Good for ${r.dosha_good_for}` : null].filter(Boolean).join(" · ")}
                </p>
              </button>
            ))}
          </div>
        </div>
      </Dialog>

      {/* Add Yoga — two-step: select → configure */}
      <Dialog
        open={addYogaOpen}
        onClose={() => { setAddYogaOpen(false); setYogaConfigStep(null); setYogaFields({}); }}
        title={yogaConfigStep ? `Configure: ${yogaConfigStep.name}` : "Add Yoga Asana"}
        className="max-w-lg"
      >
        {!yogaConfigStep ? (
          <div className="space-y-3">
            <Input placeholder="Search yoga asanas…" value={yogaSearch} onChange={(e) => setYogaSearch(e.target.value)} />
            <div className="max-h-72 overflow-y-auto space-y-1.5 -mx-1 px-1">
              {yogaLib
                .filter((y: { id: number }) => !assignedYogaRaw.some((a: { asana_id: number }) => a.asana_id === y.id))
                .map((y: { id: number; name: string; name_sanskrit: string | null; level: string | null; hold_duration: string | null; dosha_effect: string | null }) => (
                  <button
                    key={y.id}
                    onClick={() => { setYogaConfigStep({ id: y.id, name: y.name }); setYogaFields({}); }}
                    className="w-full text-left rounded-lg border px-3 py-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <p className="text-sm font-medium">{y.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {y.name_sanskrit} &middot; {y.level}{y.hold_duration && ` · ${y.hold_duration}`}{y.dosha_effect && ` · ${y.dosha_effect}`}
                    </p>
                  </button>
                ))}
              {yogaLib.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No yoga asanas found.</p>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); addYogaMutation.mutate({ asana_id: yogaConfigStep.id, ...yogaFields }); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Frequency</Label><Input placeholder="e.g. Daily" value={yogaFields.frequency ?? ""} onChange={(e) => setYogaFields((f) => ({ ...f, frequency: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Duration</Label><Input placeholder="e.g. 10 minutes" value={yogaFields.duration ?? ""} onChange={(e) => setYogaFields((f) => ({ ...f, duration: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Hold Time</Label><Input placeholder="e.g. 30 seconds" value={yogaFields.hold_time ?? ""} onChange={(e) => setYogaFields((f) => ({ ...f, hold_time: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Practice Time</Label><Input placeholder="e.g. Morning" value={yogaFields.practice_time ?? ""} onChange={(e) => setYogaFields((f) => ({ ...f, practice_time: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>Notes</Label><Textarea rows={2} placeholder="Any special instructions…" value={yogaFields.notes ?? ""} onChange={(e) => setYogaFields((f) => ({ ...f, notes: e.target.value }))} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setYogaConfigStep(null)}>Back</Button>
              <Button type="submit" disabled={addYogaMutation.isPending}>{addYogaMutation.isPending ? "Adding…" : "Add to Plan"}</Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Edit Yoga Assignment */}
      <Dialog open={editYogaId !== null} onClose={() => setEditYogaId(null)} title="Edit Yoga Assignment" className="max-w-lg">
        <form onSubmit={(e) => { e.preventDefault(); if (editYogaId) updateYogaMutation.mutate({ id: editYogaId, data: editYogaFields }); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Frequency</Label><Input placeholder="e.g. Daily" value={editYogaFields.frequency ?? ""} onChange={(e) => setEditYogaFields((f) => ({ ...f, frequency: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Duration</Label><Input placeholder="e.g. 10 minutes" value={editYogaFields.duration ?? ""} onChange={(e) => setEditYogaFields((f) => ({ ...f, duration: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Hold Time</Label><Input placeholder="e.g. 30 seconds" value={editYogaFields.hold_time ?? ""} onChange={(e) => setEditYogaFields((f) => ({ ...f, hold_time: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Practice Time</Label><Input placeholder="e.g. Morning" value={editYogaFields.practice_time ?? ""} onChange={(e) => setEditYogaFields((f) => ({ ...f, practice_time: e.target.value }))} /></div>
          </div>
          <div className="space-y-1"><Label>Notes</Label><Textarea rows={2} placeholder="Any special instructions…" value={editYogaFields.notes ?? ""} onChange={(e) => setEditYogaFields((f) => ({ ...f, notes: e.target.value }))} /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditYogaId(null)}>Cancel</Button>
            <Button type="submit" disabled={updateYogaMutation.isPending}>{updateYogaMutation.isPending ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </Dialog>

      {/* Add Pranayama — two-step: select → configure */}
      <Dialog
        open={addPranayamaOpen}
        onClose={() => { setAddPranayamaOpen(false); setPranayamaConfigStep(null); setPranayamaFields({}); }}
        title={pranayamaConfigStep ? `Configure: ${pranayamaConfigStep.name}` : "Add Pranayama Exercise"}
        className="max-w-lg"
      >
        {!pranayamaConfigStep ? (
          <div className="space-y-3">
            <Input placeholder="Search pranayama exercises…" value={pranayamaSearch} onChange={(e) => setPranayamaSearch(e.target.value)} />
            <div className="max-h-72 overflow-y-auto space-y-1.5 -mx-1 px-1">
              {pranayamaLib
                .filter((p: { id: number }) => !assignedPranayamaRaw.some((a: { pranayama_id: number }) => a.pranayama_id === p.id))
                .map((p: { id: number; name: string; name_sanskrit: string | null; category: string | null; difficulty: string | null; dosha_effect: string | null; duration_range: string | null }) => (
                  <button
                    key={p.id}
                    onClick={() => { setPranayamaConfigStep({ id: p.id, name: p.name }); setPranayamaFields({}); }}
                    className="w-full text-left rounded-lg border px-3 py-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.name_sanskrit}{p.category && ` · ${p.category}`}{p.difficulty && ` · ${p.difficulty}`}{p.dosha_effect && ` · ${p.dosha_effect}`}
                    </p>
                  </button>
                ))}
              {pranayamaLib.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No pranayama exercises found.</p>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); addPranayamaMutation.mutate({ pranayama_id: pranayamaConfigStep.id, ...pranayamaFields }); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Frequency</Label><Input placeholder="e.g. Daily" value={pranayamaFields.frequency ?? ""} onChange={(e) => setPranayamaFields((f) => ({ ...f, frequency: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Duration</Label><Input placeholder="e.g. 10 minutes" value={pranayamaFields.duration ?? ""} onChange={(e) => setPranayamaFields((f) => ({ ...f, duration: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Rounds</Label><Input placeholder="e.g. 5 rounds" value={pranayamaFields.rounds ?? ""} onChange={(e) => setPranayamaFields((f) => ({ ...f, rounds: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Practice Time</Label><Input placeholder="e.g. Morning" value={pranayamaFields.practice_time ?? ""} onChange={(e) => setPranayamaFields((f) => ({ ...f, practice_time: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>Notes</Label><Textarea rows={2} placeholder="Any special instructions…" value={pranayamaFields.notes ?? ""} onChange={(e) => setPranayamaFields((f) => ({ ...f, notes: e.target.value }))} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPranayamaConfigStep(null)}>Back</Button>
              <Button type="submit" disabled={addPranayamaMutation.isPending}>{addPranayamaMutation.isPending ? "Adding…" : "Add to Plan"}</Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Edit Pranayama Assignment */}
      <Dialog open={editPranayamaId !== null} onClose={() => setEditPranayamaId(null)} title="Edit Pranayama Assignment" className="max-w-lg">
        <form onSubmit={(e) => { e.preventDefault(); if (editPranayamaId) updatePranayamaMutation.mutate({ id: editPranayamaId, data: editPranayamaFields }); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Frequency</Label><Input placeholder="e.g. Daily" value={editPranayamaFields.frequency ?? ""} onChange={(e) => setEditPranayamaFields((f) => ({ ...f, frequency: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Duration</Label><Input placeholder="e.g. 10 minutes" value={editPranayamaFields.duration ?? ""} onChange={(e) => setEditPranayamaFields((f) => ({ ...f, duration: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Rounds</Label><Input placeholder="e.g. 5 rounds" value={editPranayamaFields.rounds ?? ""} onChange={(e) => setEditPranayamaFields((f) => ({ ...f, rounds: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Practice Time</Label><Input placeholder="e.g. Morning" value={editPranayamaFields.practice_time ?? ""} onChange={(e) => setEditPranayamaFields((f) => ({ ...f, practice_time: e.target.value }))} /></div>
          </div>
          <div className="space-y-1"><Label>Notes</Label><Textarea rows={2} placeholder="Any special instructions…" value={editPranayamaFields.notes ?? ""} onChange={(e) => setEditPranayamaFields((f) => ({ ...f, notes: e.target.value }))} /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditPranayamaId(null)}>Cancel</Button>
            <Button type="submit" disabled={updatePranayamaMutation.isPending}>{updatePranayamaMutation.isPending ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </Dialog>

      {/* New Follow-up */}
      <Dialog open={newFollowupOpen} onClose={() => setNewFollowupOpen(false)} title="Schedule Follow-up">
        <form
          onSubmit={(e) => { e.preventDefault(); addFollowupMutation.mutate(); }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label>Date *</Label>
            <Input
              type="date"
              required
              value={followupForm.scheduled_date}
              onChange={(e) => setFollowupForm((f) => ({ ...f, scheduled_date: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Input
              placeholder="e.g. 4-week follow-up, lab review"
              value={followupForm.reason}
              onChange={(e) => setFollowupForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              rows={2}
              placeholder="Any notes for this appointment…"
              value={followupForm.notes}
              onChange={(e) => setFollowupForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setNewFollowupOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={addFollowupMutation.isPending}>
              {addFollowupMutation.isPending ? "Scheduling…" : "Schedule"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Print / Export View */}
      {showPrint && plan && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto print-container">
          <PrintPatientPlan
            patient={patient}
            plan={plan}
            yogaAssignments={assignedYogaRaw}
            pranayamaAssignments={assignedPranayamaRaw}
            onClose={() => setShowPrint(false)}
          />
        </div>
      )}
    </div>
  );
}
