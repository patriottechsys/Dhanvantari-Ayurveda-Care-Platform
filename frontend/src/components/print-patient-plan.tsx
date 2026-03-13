"use client";

import { useRef } from "react";
import { Printer, Download, X, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlanData {
  title?: string;
  foods_to_include?: string;
  foods_to_avoid?: string;
  lifestyle_notes?: string;
  breathing_notes?: string;
  nasal_care_notes?: string;
  followup_notes?: string;
  supplements?: Array<{ id: number; name: string; name_sanskrit?: string; dose?: string; timing?: string; frequency?: string }>;
  recipes?: Array<{ id: number; name: string; meal_type?: string; meal_slot?: string; ingredients?: string; instructions?: string }>;
  start_date?: string;
  duration_weeks?: number;
}

interface YogaAssignment {
  id: number;
  asana_id: number;
  frequency?: string | null;
  notes?: string | null;
  asana?: {
    name: string;
    name_sanskrit?: string | null;
    level?: string | null;
    hold_duration?: string | null;
  } | null;
}

interface PatientInfo {
  full_name: string;
  email?: string;
  phone?: string;
  dosha_primary?: string;
  portal_token?: string;
}

interface PranayamaAssignment {
  id: number;
  pranayama_id: number;
  duration?: string | null;
  rounds?: string | null;
  frequency?: string | null;
  practice_time?: string | null;
  notes?: string | null;
  pranayama?: {
    name: string;
    name_sanskrit?: string | null;
    category?: string | null;
    difficulty?: string | null;
  } | null;
}

interface PrintPatientPlanProps {
  patient: PatientInfo;
  plan: PlanData;
  yogaAssignments: YogaAssignment[];
  pranayamaAssignments?: PranayamaAssignment[];
  onClose: () => void;
}

const PORTAL_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(":8747", ":3747") ?? "http://localhost:3747";

function QRCodeSVG({ value, size = 100 }: { value: string; size?: number }) {
  // Simple QR code placeholder using a Google Charts API URL embedded as image
  // For production, use a proper QR library. This gives a working QR code image.
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&margin=4`;
  return <img src={qrUrl} alt="QR Code" width={size} height={size} className="rounded" />;
}

export default function PrintPatientPlan({ patient, plan, yogaAssignments, pranayamaAssignments = [], onClose }: PrintPatientPlanProps) {
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    window.print();
  }

  const portalUrl = patient.portal_token ? `${PORTAL_BASE}/portal/${patient.portal_token}` : null;
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const planSections = [
    { label: "Foods to Include", value: plan.foods_to_include },
    { label: "Foods to Avoid", value: plan.foods_to_avoid },
    { label: "Lifestyle Recommendations", value: plan.lifestyle_notes },
    { label: "Breathing / Pranayama", value: plan.breathing_notes },
    { label: "Nasal Care (Nasya)", value: plan.nasal_care_notes },
    { label: "Follow-up Notes", value: plan.followup_notes },
  ].filter((s) => s.value);

  return (
    <>
      {/* Screen-only toolbar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-card border-b px-6 py-3 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="size-5" />
          </button>
          <h2 className="font-medium text-sm">Print Preview — {patient.full_name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
            <Printer className="size-3.5" />
            Print
          </Button>
        </div>
      </div>

      {/* Printable content */}
      <div
        ref={printRef}
        className="max-w-[800px] mx-auto bg-white text-black print:max-w-none print:mx-0"
        style={{ paddingTop: "72px" }}
      >
        <div className="p-8 print:p-6 space-y-6 print:space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between border-b pb-4 print:pb-3">
            <div>
              <h1 className="text-xl font-bold print:text-lg">Ayurvedic Care Plan</h1>
              <p className="text-sm text-gray-600 mt-1">{plan.title || "Treatment Protocol"}</p>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>{today}</p>
              {plan.duration_weeks && <p>{plan.duration_weeks}-week protocol</p>}
            </div>
          </div>

          {/* Patient Info */}
          <div className="bg-gray-50 rounded-lg p-4 print:bg-gray-100 print:p-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Patient</p>
                <p className="font-semibold">{patient.full_name}</p>
              </div>
              {patient.dosha_primary && (
                <div>
                  <p className="text-gray-500 text-xs">Primary Dosha</p>
                  <p className="font-semibold">{patient.dosha_primary}</p>
                </div>
              )}
              {patient.email && (
                <div>
                  <p className="text-gray-500 text-xs">Email</p>
                  <p>{patient.email}</p>
                </div>
              )}
              {patient.phone && (
                <div>
                  <p className="text-gray-500 text-xs">Phone</p>
                  <p>{patient.phone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Plan Sections */}
          {planSections.map(({ label, value }) => (
            <div key={label} className="space-y-1.5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 border-b border-gray-200 pb-1">
                {label}
              </h2>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{value}</p>
            </div>
          ))}

          {/* Supplements */}
          {plan.supplements && plan.supplements.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 border-b border-gray-200 pb-1">
                Supplements ({plan.supplements.length})
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="pb-1.5 pr-3">Supplement</th>
                    <th className="pb-1.5 pr-3">Dose</th>
                    <th className="pb-1.5 pr-3">Timing</th>
                    <th className="pb-1.5">Frequency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {plan.supplements.map((s) => (
                    <tr key={s.id}>
                      <td className="py-1.5 pr-3">
                        <span className="font-medium">{s.name}</span>
                        {s.name_sanskrit && <span className="text-gray-500 italic ml-1">({s.name_sanskrit})</span>}
                      </td>
                      <td className="py-1.5 pr-3 text-gray-600">{s.dose || "—"}</td>
                      <td className="py-1.5 pr-3 text-gray-600">{s.timing || "—"}</td>
                      <td className="py-1.5 text-gray-600">{s.frequency || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Recipes */}
          {plan.recipes && plan.recipes.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 border-b border-gray-200 pb-1">
                Recipes ({plan.recipes.length})
              </h2>
              <div className="space-y-3">
                {plan.recipes.map((r) => (
                  <div key={r.id} className="border rounded-lg p-3 print:p-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{r.name}</span>
                      {(r.meal_type || r.meal_slot) && (
                        <span className="text-xs text-gray-500">({[r.meal_type, r.meal_slot].filter(Boolean).join(" · ")})</span>
                      )}
                    </div>
                    {r.ingredients && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Ingredients</p>
                        <p className="text-sm whitespace-pre-wrap">{r.ingredients}</p>
                      </div>
                    )}
                    {r.instructions && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Instructions</p>
                        <p className="text-sm whitespace-pre-wrap">{r.instructions}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Yoga */}
          {yogaAssignments.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 border-b border-gray-200 pb-1">
                Yoga Asanas ({yogaAssignments.length})
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="pb-1.5 pr-3">Asana</th>
                    <th className="pb-1.5 pr-3">Level</th>
                    <th className="pb-1.5 pr-3">Duration</th>
                    <th className="pb-1.5">Frequency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {yogaAssignments.map((y) => (
                    <tr key={y.id}>
                      <td className="py-1.5 pr-3">
                        <span className="font-medium">{y.asana?.name ?? `Asana #${y.asana_id}`}</span>
                        {y.asana?.name_sanskrit && <span className="text-gray-500 italic ml-1">({y.asana.name_sanskrit})</span>}
                      </td>
                      <td className="py-1.5 pr-3 text-gray-600">{y.asana?.level || "—"}</td>
                      <td className="py-1.5 pr-3 text-gray-600">{y.asana?.hold_duration || "—"}</td>
                      <td className="py-1.5 text-gray-600">{y.frequency || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pranayama */}
          {pranayamaAssignments.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 border-b border-gray-200 pb-1">
                Pranayama ({pranayamaAssignments.length})
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="pb-1.5 pr-3">Exercise</th>
                    <th className="pb-1.5 pr-3">Duration</th>
                    <th className="pb-1.5 pr-3">Rounds</th>
                    <th className="pb-1.5 pr-3">Frequency</th>
                    <th className="pb-1.5">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pranayamaAssignments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-1.5 pr-3">
                        <span className="font-medium">{p.pranayama?.name ?? `Exercise #${p.pranayama_id}`}</span>
                        {p.pranayama?.name_sanskrit && <span className="text-gray-500 italic ml-1">({p.pranayama.name_sanskrit})</span>}
                      </td>
                      <td className="py-1.5 pr-3 text-gray-600">{p.duration || "—"}</td>
                      <td className="py-1.5 pr-3 text-gray-600">{p.rounds || "—"}</td>
                      <td className="py-1.5 pr-3 text-gray-600">{p.frequency || "—"}</td>
                      <td className="py-1.5 text-gray-600">{p.practice_time || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Portal QR Code */}
          {portalUrl && (
            <div className="border-t pt-4 print:pt-3 mt-6">
              <div className="flex items-start gap-4">
                <QRCodeSVG value={portalUrl} size={90} />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold flex items-center gap-1.5">
                    <QrCode className="size-3.5 print:hidden" />
                    Patient Portal
                  </h3>
                  <p className="text-xs text-gray-600">
                    Scan this QR code to access your personalized health portal where you can submit daily check-ins,
                    view your care plan, and track progress.
                  </p>
                  <p className="text-xs text-gray-400 break-all">{portalUrl}</p>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t pt-3 mt-6 text-center text-xs text-gray-400">
            <p>Dhanvantari Ayurveda Care Platform — Generated {today}</p>
            <p className="mt-0.5">This plan is personalized and should not be shared without practitioner approval.</p>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(.print-container) { display: none !important; }
          .print\\:hidden { display: none !important; }
          @page { margin: 0.5in; size: letter; }
        }
      `}</style>
    </>
  );
}
