"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  Link2,
  Copy,
  Check,
  Eye,
  UserPlus,
  X,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  XCircle,
  FileSearch,
} from "lucide-react";
import { intakeApi } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Submission = {
  id: number;
  token_id: number;
  status: "pending" | "reviewed" | "approved" | "rejected";
  submitted_at: string;
  reviewed_at?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  dob?: string;
  sex?: string;
  address?: string;
  occupation?: string;
  chief_concern?: string;
  symptom_duration?: string;
  treatment_goals?: string;
  current_medications?: string;
  allergies?: string;
  past_surgeries?: string;
  chronic_conditions?: string;
  family_history?: string;
  diet_type?: string;
  exercise_habits?: string;
  sleep_patterns?: string;
  stress_level?: number;
  smoking?: string;
  alcohol?: string;
  caffeine?: string;
  digestive_patterns?: string;
  elimination_patterns?: string;
  energy_levels?: string;
  mental_tendencies?: string;
  prior_ayurvedic_care?: string;
  previous_treatments?: string;
  rejection_reason?: string;
  patient_id?: number;
};

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  reviewed: { label: "Reviewed", color: "bg-blue-100 text-blue-800", icon: FileSearch },
  approved: { label: "Approved", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800", icon: XCircle },
};

const FRONTEND_URL = typeof window !== "undefined" ? window.location.origin : "";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</h4>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-muted-foreground min-w-[140px] shrink-0">{label}:</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function SubmissionCard({ sub, onRefresh }: { sub: Submission; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const qc = useQueryClient();

  const reviewMut = useMutation({
    mutationFn: () => intakeApi.reviewSubmission(sub.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["intake-submissions"] }); },
  });

  const approveMut = useMutation({
    mutationFn: () => intakeApi.approveSubmission(sub.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["intake-submissions"] }); },
  });

  const rejectMut = useMutation({
    mutationFn: () => intakeApi.rejectSubmission(sub.id, rejectReason || undefined),
    onSuccess: () => { setShowReject(false); qc.invalidateQueries({ queryKey: ["intake-submissions"] }); },
  });

  const deleteMut = useMutation({
    mutationFn: () => intakeApi.deleteSubmission(sub.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["intake-submissions"] }); },
  });

  const cfg = STATUS_CONFIG[sub.status];
  const StatusIcon = cfg.icon;

  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
              {sub.first_name[0]}{sub.last_name[0]}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm">{sub.first_name} {sub.last_name}</h3>
              <p className="text-xs text-muted-foreground">
                {new Date(sub.submitted_at).toLocaleDateString()} {sub.chief_concern && `\u2014 ${sub.chief_concern.slice(0, 60)}${sub.chief_concern.length > 60 ? "..." : ""}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 gap-1", cfg.color)}>
              <StatusIcon className="size-3" />
              {cfg.label}
            </Badge>
            {expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t space-y-4 pt-4">
          {/* Demographics */}
          <Section title="Demographics">
            <Field label="Date of Birth" value={sub.dob} />
            <Field label="Sex" value={sub.sex} />
            <Field label="Email" value={sub.email} />
            <Field label="Phone" value={sub.phone} />
            <Field label="Address" value={sub.address} />
            <Field label="Occupation" value={sub.occupation} />
          </Section>

          {/* Reason for Visit */}
          {(sub.chief_concern || sub.symptom_duration || sub.treatment_goals) && (
            <Section title="Reason for Visit">
              <Field label="Chief Concern" value={sub.chief_concern} />
              <Field label="Duration" value={sub.symptom_duration} />
              <Field label="Previous Treatments" value={sub.previous_treatments} />
              <Field label="Treatment Goals" value={sub.treatment_goals} />
            </Section>
          )}

          {/* Medical History */}
          {(sub.current_medications || sub.allergies || sub.chronic_conditions) && (
            <Section title="Medical History">
              <Field label="Medications" value={sub.current_medications} />
              <Field label="Allergies" value={sub.allergies} />
              <Field label="Past Surgeries" value={sub.past_surgeries} />
              <Field label="Chronic Conditions" value={sub.chronic_conditions} />
              <Field label="Family History" value={sub.family_history} />
            </Section>
          )}

          {/* Lifestyle */}
          {(sub.diet_type || sub.exercise_habits || sub.sleep_patterns) && (
            <Section title="Lifestyle">
              <Field label="Diet Type" value={sub.diet_type} />
              <Field label="Exercise" value={sub.exercise_habits} />
              <Field label="Sleep" value={sub.sleep_patterns} />
              <Field label="Stress Level" value={sub.stress_level ? `${sub.stress_level}/5` : undefined} />
              <Field label="Smoking" value={sub.smoking} />
              <Field label="Alcohol" value={sub.alcohol} />
              <Field label="Caffeine" value={sub.caffeine} />
            </Section>
          )}

          {/* Ayurvedic */}
          {(sub.digestive_patterns || sub.elimination_patterns || sub.energy_levels) && (
            <Section title="Ayurvedic Assessment">
              <Field label="Digestion" value={sub.digestive_patterns} />
              <Field label="Elimination" value={sub.elimination_patterns} />
              <Field label="Energy Levels" value={sub.energy_levels} />
              <Field label="Mental Tendencies" value={sub.mental_tendencies} />
              <Field label="Prior Ayurvedic Care" value={sub.prior_ayurvedic_care} />
            </Section>
          )}

          {sub.rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs font-medium text-red-800">Rejection Reason:</p>
              <p className="text-sm text-red-700">{sub.rejection_reason}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {sub.status === "pending" && (
              <Button size="sm" variant="outline" onClick={() => reviewMut.mutate()} disabled={reviewMut.isPending}>
                <Eye className="size-3.5 mr-1.5" />
                Mark Reviewed
              </Button>
            )}
            {(sub.status === "pending" || sub.status === "reviewed") && (
              <>
                <Button size="sm" onClick={() => approveMut.mutate()} disabled={approveMut.isPending}>
                  {approveMut.isPending ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <UserPlus className="size-3.5 mr-1.5" />}
                  Approve & Create Patient
                </Button>
                <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setShowReject(!showReject)}>
                  <X className="size-3.5 mr-1.5" />
                  Reject
                </Button>
              </>
            )}
            {(sub.status === "pending" || sub.status === "rejected") && (
              <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { if (confirm("Delete this submission?")) deleteMut.mutate(); }} disabled={deleteMut.isPending}>
                <Trash2 className="size-3.5 mr-1.5" />
                Delete
              </Button>
            )}
            {sub.status === "approved" && sub.patient_id && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Patient created (ID: {sub.patient_id})
              </Badge>
            )}
          </div>

          {showReject && (
            <div className="flex gap-2 items-end">
              <textarea
                className="flex-1 text-sm border rounded-lg px-3 py-2 resize-none"
                rows={2}
                placeholder="Reason for rejection (optional)..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <Button size="sm" variant="destructive" onClick={() => rejectMut.mutate()} disabled={rejectMut.isPending}>
                {rejectMut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Reject"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function IntakePage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const { data: submissions = [], isLoading } = useQuery<Submission[]>({
    queryKey: ["intake-submissions", statusFilter],
    queryFn: () => intakeApi.listSubmissions(statusFilter || undefined).then((r) => r.data),
  });

  const generateMut = useMutation({
    mutationFn: () => intakeApi.generateLink(),
    onSuccess: (res) => {
      const path = res.data.intake_url_path;
      const fullUrl = `${FRONTEND_URL}${path}`;
      setGeneratedLink(fullUrl);
      setCopied(false);
    },
  });

  function copyLink() {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const counts = {
    all: submissions.length,
    pending: submissions.filter((s) => s.status === "pending").length,
    reviewed: submissions.filter((s) => s.status === "reviewed").length,
    approved: submissions.filter((s) => s.status === "approved").length,
    rejected: submissions.filter((s) => s.status === "rejected").length,
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Intake Forms</h1>
          <p className="text-sm text-muted-foreground">
            Generate intake links for new patients and review submissions
          </p>
        </div>
        <Button onClick={() => generateMut.mutate()} disabled={generateMut.isPending}>
          {generateMut.isPending ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Link2 className="size-4 mr-2" />
          )}
          Generate Intake Link
        </Button>
      </div>

      {/* Generated Link */}
      {generatedLink && (
        <div className="border border-primary/30 bg-primary/5 rounded-xl p-4">
          <p className="text-sm font-medium mb-2">New Intake Link Generated</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-background border rounded-lg px-3 py-2 truncate">
              {generatedLink}
            </code>
            <Button size="sm" variant="outline" onClick={copyLink}>
              {copied ? <Check className="size-3.5 mr-1.5 text-green-600" /> : <Copy className="size-3.5 mr-1.5" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Share this link with the patient. They can fill out the intake form without logging in.
          </p>
        </div>
      )}

      {/* Status Filter */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { key: "", label: "All", count: counts.all },
          { key: "pending", label: "Pending", count: counts.pending },
          { key: "reviewed", label: "Reviewed", count: counts.reviewed },
          { key: "approved", label: "Approved", count: counts.approved },
          { key: "rejected", label: "Rejected", count: counts.rejected },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
              statusFilter === f.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-muted"
            )}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Submissions List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <ClipboardList className="size-7 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">No submissions yet</p>
            <p className="text-xs text-muted-foreground">
              Generate an intake link and share it with a new patient to get started.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => (
            <SubmissionCard
              key={sub.id}
              sub={sub}
              onRefresh={() => qc.invalidateQueries({ queryKey: ["intake-submissions"] })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
