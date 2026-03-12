"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { portalApi } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/* ── Types ──────────────────────────────────────────────────────────────── */

interface PortalHome {
  patient: { id: number; first_name: string; last_name: string };
  today_checkin_done: boolean;
  streak: number;
  days_since_start: number;
  plan_summary: {
    id: number;
    title: string;
    supplement_count: number;
    recipe_count: number;
  } | null;
  next_followup: {
    id: number;
    scheduled_date: string;
    reason: string;
    days_until: number;
  } | null;
}

interface PlanDetail {
  title: string;
  foods_to_avoid: string | null;
  foods_to_include: string | null;
  lifestyle_notes: string | null;
  breathing_notes: string | null;
  nasal_care_notes: string | null;
  supplements: {
    name: string;
    name_sanskrit: string | null;
    dose: string | null;
    timing: string | null;
    frequency: string | null;
    purpose: string | null;
  }[];
  recipes: {
    name: string;
    meal_type: string | null;
    meal_slot: string | null;
    ingredients: string | null;
    instructions: string | null;
  }[];
}

/* ── Habit check-in fields ──────────────────────────────────────────────── */

const HABIT_GROUPS = [
  {
    label: "Morning Routine",
    fields: [
      { key: "warm_water", label: "Warm water on waking" },
      { key: "breathing_exercise", label: "Breathing exercise (pranayama)" },
      { key: "nasal_oil", label: "Nasal oil (nasya)" },
    ],
  },
  {
    label: "Meals & Diet",
    fields: [
      { key: "warm_breakfast", label: "Warm breakfast" },
      { key: "herbal_tea_am", label: "Herbal tea (morning)" },
      { key: "warm_lunch", label: "Warm lunch" },
      { key: "included_barley", label: "Included barley/grains" },
      { key: "warm_dinner", label: "Warm dinner" },
      { key: "dinner_before_8pm", label: "Dinner before 8 PM" },
      { key: "avoided_cold_food", label: "Avoided cold foods" },
      { key: "avoided_yogurt", label: "Avoided yogurt/dairy" },
      { key: "no_cold_drinks", label: "No cold drinks" },
    ],
  },
  {
    label: "Supplements",
    fields: [
      { key: "supplements_am", label: "Morning supplements taken" },
      { key: "supplements_pm", label: "Evening supplements taken" },
    ],
  },
  {
    label: "Lifestyle",
    fields: [
      { key: "cardio_today", label: "Exercise / movement" },
      { key: "consistent_sleep", label: "Consistent sleep schedule" },
    ],
  },
];

const SYMPTOM_FIELDS = [
  { key: "digestion_score", label: "Digestion", emoji: "🔥" },
  { key: "energy_score", label: "Energy", emoji: "⚡" },
  { key: "sinus_score", label: "Sinus / Breathing", emoji: "🌬" },
  { key: "urinary_score", label: "Urinary", emoji: "💧" },
];

const DEFAULT_HABITS: Record<string, boolean> = {};
HABIT_GROUPS.forEach((g) => g.fields.forEach((f) => (DEFAULT_HABITS[f.key] = false)));

/* ── Component ──────────────────────────────────────────────────────────── */

export default function PortalPage() {
  const { token } = useParams<{ token: string }>();
  const [home, setHome] = useState<PortalHome | null>(null);
  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Check-in form state
  const [habits, setHabits] = useState<Record<string, boolean>>({ ...DEFAULT_HABITS });
  const [symptoms, setSymptoms] = useState<Record<string, number | null>>({
    digestion_score: null,
    energy_score: null,
    sinus_score: null,
    urinary_score: null,
  });
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [completionPct, setCompletionPct] = useState<number | null>(null);

  // Active tab
  const [tab, setTab] = useState<"checkin" | "plan">("checkin");

  const fetchData = useCallback(async () => {
    try {
      const [homeRes, planRes] = await Promise.allSettled([
        portalApi.home(token),
        portalApi.plan(token),
      ]);
      if (homeRes.status === "fulfilled") {
        setHome(homeRes.value.data);
        if (homeRes.value.data.today_checkin_done) setSubmitted(true);
      } else {
        setError("Invalid or expired portal link.");
      }
      if (planRes.status === "fulfilled") setPlan(planRes.value.data);
    } catch {
      setError("Unable to load your portal.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function toggleHabit(key: string) {
    setHabits((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function setSymptom(key: string, val: number) {
    setSymptoms((prev) => ({ ...prev, [key]: prev[key] === val ? null : val }));
  }

  async function submitCheckin() {
    setSubmitting(true);
    try {
      const { data } = await portalApi.checkin(token, {
        ...habits,
        ...symptoms,
        notes: notes || null,
      });
      setSubmitted(true);
      setCompletionPct(data.habit_completion_pct);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      if (detail === "Already checked in today") {
        setSubmitted(true);
      } else {
        alert("Failed to submit. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Render ────────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">Loading your portal...</div>
      </div>
    );
  }

  if (error || !home) {
    return (
      <div className="text-center py-20 space-y-2">
        <p className="text-lg font-medium text-destructive">{error || "Something went wrong"}</p>
        <p className="text-sm text-muted-foreground">Please check your link or contact your practitioner.</p>
      </div>
    );
  }

  const doneCount = Object.values(habits).filter(Boolean).length;
  const totalHabits = Object.keys(habits).length;

  return (
    <div className="space-y-6">
      {/* Greeting + Stats */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Namaste, {home.patient.first_name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Streak" value={`${home.streak} day${home.streak !== 1 ? "s" : ""}`} />
        <StatCard label="Journey" value={`${home.days_since_start} days`} />
        <StatCard
          label="Next Visit"
          value={home.next_followup ? `${home.next_followup.days_until}d` : "—"}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1">
        <TabButton active={tab === "checkin"} onClick={() => setTab("checkin")}>
          Daily Check-in
        </TabButton>
        <TabButton active={tab === "plan"} onClick={() => setTab("plan")}>
          My Plan
        </TabButton>
      </div>

      {/* ── Check-in Tab ───────────────────────────────────────────────────── */}
      {tab === "checkin" && (
        submitted ? (
          <div className="text-center py-10 space-y-3">
            <div className="text-4xl">🙏</div>
            <h2 className="text-xl font-semibold">Today&apos;s check-in is complete!</h2>
            {completionPct !== null && (
              <p className="text-sm text-muted-foreground">
                You completed <span className="font-semibold text-primary">{completionPct}%</span> of your habits today.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Come back tomorrow to keep your streak going.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Progress indicator */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${totalHabits ? (doneCount / totalHabits) * 100 : 0}%` }}
                />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {doneCount}/{totalHabits}
              </span>
            </div>

            {/* Habit groups */}
            {HABIT_GROUPS.map((group) => (
              <div key={group.label} className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {group.label}
                </h3>
                <div className="space-y-1">
                  {group.fields.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => toggleHabit(f.key)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                        habits[f.key]
                          ? "bg-accent text-accent-foreground"
                          : "bg-card hover:bg-muted border border-border"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                          habits[f.key]
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        }`}
                      >
                        {habits[f.key] && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Symptom scores */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                How are you feeling? (1 = poor, 5 = great)
              </h3>
              {SYMPTOM_FIELDS.map((s) => (
                <div key={s.key} className="space-y-1">
                  <p className="text-sm font-medium">
                    {s.emoji} {s.label}
                  </p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setSymptom(s.key, v)}
                        className={`w-10 h-10 rounded-lg text-sm font-semibold transition-colors ${
                          symptoms[s.key] === v
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border border-border hover:bg-muted"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                placeholder="How are you feeling today? Any observations..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Submit */}
            <Button
              size="lg"
              className="w-full"
              disabled={submitting}
              onClick={submitCheckin}
            >
              {submitting ? "Submitting..." : "Submit Check-in"}
            </Button>
          </div>
        )
      )}

      {/* ── Plan Tab ───────────────────────────────────────────────────────── */}
      {tab === "plan" && (
        plan ? (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">{plan.title}</h2>

            {/* Supplements */}
            {plan.supplements.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Supplements ({plan.supplements.length})
                </h3>
                <div className="space-y-2">
                  {plan.supplements.map((s, i) => (
                    <div key={i} className="bg-card border border-border rounded-lg p-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm">{s.name}</p>
                        {s.name_sanskrit && (
                          <span className="text-xs text-muted-foreground italic shrink-0">{s.name_sanskrit}</span>
                        )}
                      </div>
                      {s.dose && <p className="text-xs text-muted-foreground">Dose: {s.dose}</p>}
                      {s.timing && <p className="text-xs text-muted-foreground">When: {s.timing}</p>}
                      {s.purpose && <p className="text-xs text-muted-foreground">{s.purpose}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recipes */}
            {plan.recipes.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Recipes ({plan.recipes.length})
                </h3>
                <div className="space-y-2">
                  {plan.recipes.map((r, i) => (
                    <div key={i} className="bg-card border border-border rounded-lg p-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm">{r.name}</p>
                        {r.meal_slot && (
                          <span className="text-xs bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 shrink-0">
                            {r.meal_slot}
                          </span>
                        )}
                      </div>
                      {r.ingredients && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{r.ingredients}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Diet guidance */}
            {(plan.foods_to_avoid || plan.foods_to_include) && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Diet Guidance
                </h3>
                <div className="bg-card border border-border rounded-lg p-3 space-y-2 text-sm">
                  {plan.foods_to_include && (
                    <div>
                      <p className="font-medium text-accent-foreground">Include:</p>
                      <p className="text-muted-foreground">{plan.foods_to_include}</p>
                    </div>
                  )}
                  {plan.foods_to_avoid && (
                    <div>
                      <p className="font-medium text-destructive">Avoid:</p>
                      <p className="text-muted-foreground">{plan.foods_to_avoid}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Lifestyle notes */}
            {(plan.lifestyle_notes || plan.breathing_notes || plan.nasal_care_notes) && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Lifestyle
                </h3>
                <div className="bg-card border border-border rounded-lg p-3 space-y-2 text-sm text-muted-foreground">
                  {plan.lifestyle_notes && <p>{plan.lifestyle_notes}</p>}
                  {plan.breathing_notes && <p>{plan.breathing_notes}</p>}
                  {plan.nasal_care_notes && <p>{plan.nasal_care_notes}</p>}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <p>No active care plan yet.</p>
            <p className="text-sm">Your practitioner will create one for you.</p>
          </div>
        )
      )}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-center">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
