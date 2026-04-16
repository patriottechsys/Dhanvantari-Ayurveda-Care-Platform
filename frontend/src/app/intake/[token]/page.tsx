"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { intakeApi } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type PracticeInfo = {
  name?: string;
  logo_url?: string;
  tagline?: string;
  practitioner_name?: string;
  designation?: string;
};

type FormData = Record<string, string | number>;

const STEPS = [
  { key: "demographics", label: "Personal Info" },
  { key: "visit", label: "Reason for Visit" },
  { key: "medical", label: "Medical History" },
  { key: "lifestyle", label: "Lifestyle" },
  { key: "ayurvedic", label: "Ayurvedic" },
];

function TextArea({
  label,
  name,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="text-sm font-medium mb-1 block">{label}</label>
      <textarea
        className="w-full text-sm border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
      />
    </div>
  );
}

function FormField({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-medium mb-1 block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <Input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        required={required}
      />
    </div>
  );
}

export default function IntakeFormPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [practice, setPractice] = useState<PracticeInfo | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<FormData>({});

  useEffect(() => {
    intakeApi
      .getForm(token)
      .then((res) => {
        setPractice(res.data.practice);
        setAlreadySubmitted(res.data.already_submitted);
      })
      .catch(() => setError("This intake link is invalid or has expired."))
      .finally(() => setLoading(false));
  }, [token]);

  function updateField(name: string, value: string | number) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit() {
    if (!form.first_name || !form.last_name) return;
    setSubmitting(true);
    try {
      await intakeApi.submit(token, form);
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Failed to submit form. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-3 max-w-md">
          <AlertCircle className="size-12 text-red-500 mx-auto" />
          <h1 className="text-lg font-semibold">Unable to Load Form</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (alreadySubmitted || submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-3 max-w-md">
          <CheckCircle2 className="size-12 text-green-600 mx-auto" />
          <h1 className="text-lg font-semibold">
            {submitted ? "Form Submitted Successfully!" : "Form Already Submitted"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {submitted
              ? "Thank you for completing your intake form. Your practitioner will review your information shortly."
              : "This intake form has already been completed. Your practitioner has received your information."}
          </p>
          {practice?.name && (
            <p className="text-xs text-muted-foreground">{practice.name}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
            &#x0950;
          </div>
          <div>
            <h1 className="font-semibold text-sm">{practice?.name || "Dhanvantari"}</h1>
            <p className="text-xs text-muted-foreground">
              {practice?.practitioner_name && `${practice.practitioner_name}`}
              {practice?.designation && `, ${practice.designation}`}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Title */}
        <div className="mb-6">
          <h2 className="text-xl font-bold">Patient Intake Form</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Please complete this form before your appointment. All information is confidential.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1 mb-6">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setStep(i)}
              className={cn(
                "flex-1 text-center py-2 text-xs font-medium rounded-lg transition-colors",
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-card border rounded-xl p-5 space-y-4">
          {step === 0 && (
            <>
              <h3 className="font-semibold text-sm mb-3">Personal Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="First Name" name="first_name" value={(form.first_name as string) || ""} onChange={updateField} required />
                <FormField label="Last Name" name="last_name" value={(form.last_name as string) || ""} onChange={updateField} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Date of Birth" name="dob" value={(form.dob as string) || ""} onChange={updateField} type="date" />
                <div>
                  <label className="text-sm font-medium mb-1 block">Sex</label>
                  <Select value={(form.sex as string) || ""} onChange={(e) => updateField("sex", e.target.value)}>
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Email" name="email" value={(form.email as string) || ""} onChange={updateField} type="email" placeholder="your@email.com" />
                <FormField label="Phone" name="phone" value={(form.phone as string) || ""} onChange={updateField} placeholder="(xxx) xxx-xxxx" />
              </div>
              <FormField label="Address" name="address" value={(form.address as string) || ""} onChange={updateField} placeholder="Street, City, State, ZIP" />
              <FormField label="Occupation" name="occupation" value={(form.occupation as string) || ""} onChange={updateField} />
            </>
          )}

          {step === 1 && (
            <>
              <h3 className="font-semibold text-sm mb-3">Reason for Visit</h3>
              <TextArea label="Chief Concern" name="chief_concern" value={(form.chief_concern as string) || ""} onChange={updateField} placeholder="What brings you in today? Describe your primary concern..." />
              <FormField label="How long have you had these symptoms?" name="symptom_duration" value={(form.symptom_duration as string) || ""} onChange={updateField} placeholder="e.g., 3 months, 2 years" />
              <TextArea label="Previous Treatments" name="previous_treatments" value={(form.previous_treatments as string) || ""} onChange={updateField} placeholder="Any treatments you've tried for this concern..." />
              <TextArea label="Treatment Goals" name="treatment_goals" value={(form.treatment_goals as string) || ""} onChange={updateField} placeholder="What would you like to achieve through Ayurvedic care?" />
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="font-semibold text-sm mb-3">Medical History</h3>
              <TextArea label="Current Medications" name="current_medications" value={(form.current_medications as string) || ""} onChange={updateField} placeholder="List any medications, supplements, or herbs you currently take..." />
              <TextArea label="Allergies" name="allergies" value={(form.allergies as string) || ""} onChange={updateField} placeholder="Any known allergies (food, medication, environmental)..." />
              <TextArea label="Past Surgeries" name="past_surgeries" value={(form.past_surgeries as string) || ""} onChange={updateField} placeholder="List any past surgeries or hospitalizations..." />
              <TextArea label="Chronic Conditions" name="chronic_conditions" value={(form.chronic_conditions as string) || ""} onChange={updateField} placeholder="Any ongoing health conditions..." />
              <TextArea label="Family History" name="family_history" value={(form.family_history as string) || ""} onChange={updateField} placeholder="Significant health conditions in your family..." />
            </>
          )}

          {step === 3 && (
            <>
              <h3 className="font-semibold text-sm mb-3">Lifestyle</h3>
              <div>
                <label className="text-sm font-medium mb-1 block">Diet Type</label>
                <Select value={(form.diet_type as string) || ""} onChange={(e) => updateField("diet_type", e.target.value)}>
                  <option value="">Select...</option>
                  <option value="Vegetarian">Vegetarian</option>
                  <option value="Vegan">Vegan</option>
                  <option value="Non-vegetarian">Non-vegetarian</option>
                  <option value="Pescatarian">Pescatarian</option>
                  <option value="Other">Other</option>
                </Select>
              </div>
              <TextArea label="Exercise Habits" name="exercise_habits" value={(form.exercise_habits as string) || ""} onChange={updateField} placeholder="Type, frequency, and duration of exercise..." />
              <TextArea label="Sleep Patterns" name="sleep_patterns" value={(form.sleep_patterns as string) || ""} onChange={updateField} placeholder="Bedtime, wake time, quality of sleep..." rows={2} />
              <div>
                <label className="text-sm font-medium mb-1 block">Stress Level (1-5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => updateField("stress_level", n)}
                      className={cn(
                        "w-10 h-10 rounded-lg border text-sm font-medium transition-colors",
                        form.stress_level === n
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">1 = Very low, 5 = Very high</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Smoking</label>
                  <Select value={(form.smoking as string) || ""} onChange={(e) => updateField("smoking", e.target.value)}>
                    <option value="">Select...</option>
                    <option value="Never">Never</option>
                    <option value="Former">Former</option>
                    <option value="Occasional">Occasional</option>
                    <option value="Regular">Regular</option>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Alcohol</label>
                  <Select value={(form.alcohol as string) || ""} onChange={(e) => updateField("alcohol", e.target.value)}>
                    <option value="">Select...</option>
                    <option value="Never">Never</option>
                    <option value="Occasional">Occasional</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Regular">Regular</option>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Caffeine</label>
                  <Select value={(form.caffeine as string) || ""} onChange={(e) => updateField("caffeine", e.target.value)}>
                    <option value="">Select...</option>
                    <option value="None">None</option>
                    <option value="1 cup/day">1 cup/day</option>
                    <option value="2-3 cups/day">2-3 cups/day</option>
                    <option value="4+ cups/day">4+ cups/day</option>
                  </Select>
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h3 className="font-semibold text-sm mb-3">Ayurvedic Assessment</h3>
              <TextArea label="Digestive Patterns" name="digestive_patterns" value={(form.digestive_patterns as string) || ""} onChange={updateField} placeholder="Appetite, bloating, gas, acidity, bowel regularity..." />
              <TextArea label="Elimination Patterns" name="elimination_patterns" value={(form.elimination_patterns as string) || ""} onChange={updateField} placeholder="Bowel movement frequency, consistency, urination..." />
              <TextArea label="Energy Levels" name="energy_levels" value={(form.energy_levels as string) || ""} onChange={updateField} placeholder="Morning energy, afternoon slumps, overall vitality..." rows={2} />
              <TextArea label="Mental Tendencies" name="mental_tendencies" value={(form.mental_tendencies as string) || ""} onChange={updateField} placeholder="Anxiety, focus, memory, emotional patterns..." rows={2} />
              <TextArea label="Prior Ayurvedic Care" name="prior_ayurvedic_care" value={(form.prior_ayurvedic_care as string) || ""} onChange={updateField} placeholder="Previous Ayurvedic treatments, Panchakarma, consultations..." />
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-4">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={step === 0}
          >
            Previous
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)}>
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting || !form.first_name || !form.last_name}
            >
              {submitting ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4 mr-2" />
              )}
              Submit Intake Form
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
