"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { portalApi } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PortalPrintPage() {
  const params = useParams();
  const token = params.token as string;

  const [plan, setPlan] = useState<Record<string, unknown> | null>(null);
  const [home, setHome] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      portalApi.plan(token).then((r) => r.data),
      portalApi.home(token).then((r) => r.data),
    ])
      .then(([planData, homeData]) => {
        setPlan(planData);
        setHome(homeData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">No care plan found.</p>
      </div>
    );
  }

  const patient = (home?.patient || {}) as Record<string, unknown>;
  const patientName = `${patient.first_name || ""} ${patient.last_name || ""}`.trim();
  const supplements = (plan.supplements || []) as Array<Record<string, unknown>>;
  const recipes = (plan.recipes || []) as Array<Record<string, unknown>>;
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const textSections = [
    { label: "Foods to Include", value: plan.foods_to_include },
    { label: "Foods to Avoid", value: plan.foods_to_avoid },
    { label: "Lifestyle Recommendations", value: plan.lifestyle_notes },
    { label: "Breathing / Pranayama", value: plan.breathing_notes },
    { label: "Nasal Care (Nasya)", value: plan.nasal_care_notes },
    { label: "Follow-up Notes", value: plan.followup_notes },
  ].filter((s) => s.value);

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Toolbar — hidden on print */}
      <div className="sticky top-0 z-10 bg-white border-b px-6 py-3 flex items-center justify-between print:hidden">
        <Link
          href={`/portal/${token}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" /> Back to Portal
        </Link>
        <Button size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="size-3.5" /> Print / Save PDF
        </Button>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto p-8 print:p-6 space-y-6 print:space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-primary pb-4 print:pb-3">
          <div>
            <h1 className="text-2xl font-bold text-primary print:text-xl">Dhanvantari</h1>
            <p className="text-sm text-gray-600">Ayurvedic Wellness Care Plan</p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>{today}</p>
          </div>
        </div>

        {/* Patient */}
        <div className="bg-gray-50 rounded-lg p-4 print:bg-gray-100 print:p-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Patient</p>
              <p className="font-semibold">{patientName}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Plan</p>
              <p className="font-semibold">{plan.title as string || "Treatment Protocol"}</p>
            </div>
          </div>
        </div>

        {/* Text sections */}
        {textSections.map(({ label, value }) => (
          <section key={label} className="break-inside-avoid">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 border-b border-gray-200 pb-1 mb-2">
              {label}
            </h2>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{value as string}</p>
          </section>
        ))}

        {/* Supplements */}
        {supplements.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 border-b border-gray-200 pb-1 mb-2">
              Supplements ({supplements.length})
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
                {supplements.map((s) => (
                  <tr key={s.id as number}>
                    <td className="py-1.5 pr-3">
                      <span className="font-medium">{s.name as string}</span>
                      {s.name_sanskrit && <span className="text-gray-500 italic ml-1">({s.name_sanskrit as string})</span>}
                    </td>
                    <td className="py-1.5 pr-3 text-gray-600">{(s.dose as string) || "—"}</td>
                    <td className="py-1.5 pr-3 text-gray-600">{(s.timing as string) || "—"}</td>
                    <td className="py-1.5 text-gray-600">{(s.frequency as string) || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Recipes */}
        {recipes.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 border-b border-gray-200 pb-1 mb-2">
              Recipes ({recipes.length})
            </h2>
            <div className="space-y-3">
              {recipes.map((r) => (
                <div key={r.id as number} className="border rounded-lg p-3 print:p-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{r.name as string}</span>
                    {(r.meal_type || r.meal_slot) && (
                      <span className="text-xs text-gray-500">({[r.meal_type, r.meal_slot].filter(Boolean).join(" · ")})</span>
                    )}
                  </div>
                  {r.ingredients && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Ingredients</p>
                      <p className="text-sm whitespace-pre-wrap">{r.ingredients as string}</p>
                    </div>
                  )}
                  {r.instructions && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Instructions</p>
                      <p className="text-sm whitespace-pre-wrap">{r.instructions as string}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="border-t pt-3 mt-6 text-center text-xs text-gray-400">
          <p>Dhanvantari Ayurveda Care Platform — Generated {today}</p>
          <p className="mt-0.5">This plan is personalized. Please consult your practitioner before making changes.</p>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          @page { margin: 0.5in; size: letter; }
          section { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
