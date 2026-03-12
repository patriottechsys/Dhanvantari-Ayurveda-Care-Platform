"use client";

import { useEffect, useState, useRef } from "react";
import { practitionersApi, billingApi, api } from "@/lib/api/client";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Profile {
  id: number;
  name: string;
  email: string;
  practice_name: string | null;
  practice_logo_url: string | null;
  designation: string | null;
  bio: string | null;
  tagline: string | null;
  location: string | null;
  telehealth_url: string | null;
  website: string | null;
  subscription_tier: string;
  subscription_active: boolean;
  in_trial: boolean;
  trial_ends_at: string | null;
  created_at: string;
}

const PLANS = [
  {
    tier: "seed",
    name: "Seed",
    price: 49,
    popular: false,
    features: ["Up to 30 patients", "Care plans & check-ins", "Email support"],
  },
  {
    tier: "practice",
    name: "Practice",
    price: 89,
    popular: true,
    features: ["Unlimited patients", "AI plan drafts & insights", "Priority support"],
  },
  {
    tier: "clinic",
    name: "Clinic",
    price: 149,
    popular: false,
    features: ["Multi-practitioner", "All Practice features", "Custom branding"],
  },
];

export default function SettingsPage() {
  const { practitioner, setAuth } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form fields
  const [form, setForm] = useState({
    name: "",
    practice_name: "",
    designation: "",
    tagline: "",
    bio: "",
    location: "",
    telehealth_url: "",
    website: "",
  });

  useEffect(() => {
    practitionersApi.getMe().then(({ data }) => {
      setProfile(data);
      setForm({
        name: data.name || "",
        practice_name: data.practice_name || "",
        designation: data.designation || "",
        tagline: data.tagline || "",
        bio: data.bio || "",
        location: data.location || "",
        telehealth_url: data.telehealth_url || "",
        website: data.website || "",
      });
      setLoading(false);
    });
  }, []);

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { data } = await practitionersApi.patchMe(form);
      setProfile(data);
      // Update Zustand store so sidebar reflects changes
      if (practitioner) {
        const token = localStorage.getItem("access_token") || "";
        const refresh = localStorage.getItem("refresh_token") || "";
        setAuth({ ...practitioner, name: data.name, practice_name: data.practice_name }, token, refresh);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post("/api/practitioners/me/logo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProfile((prev) => prev ? { ...prev, practice_logo_url: data.practice_logo_url } : prev);
    } catch {
      alert("Logo upload failed. Max 2MB, JPEG/PNG/WebP only.");
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your practice profile</p>
      </div>

      {/* Logo */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Practice Logo</h2>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden border border-border shrink-0">
            {profile?.practice_logo_url ? (
              <img
                src={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8747"}${profile.practice_logo_url}`}
                alt="Logo"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-primary">ॐ</span>
            )}
          </div>
          <div className="space-y-1">
            <Button
              variant="outline"
              size="sm"
              disabled={logoUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {logoUploading ? "Uploading..." : "Upload Logo"}
            </Button>
            <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP. Max 2MB.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>
        </div>
      </section>

      {/* Practice Info */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Practice Information</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="practice_name">Practice Name</Label>
            <Input
              id="practice_name"
              value={form.practice_name}
              onChange={(e) => updateField("practice_name", e.target.value)}
              placeholder="e.g. Meenakshi Ayurveda"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="designation">Designation</Label>
            <Input
              id="designation"
              value={form.designation}
              onChange={(e) => updateField("designation", e.target.value)}
              placeholder="e.g. Vaidya, BAMS"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tagline">Tagline</Label>
          <Input
            id="tagline"
            value={form.tagline}
            onChange={(e) => updateField("tagline", e.target.value)}
            placeholder="e.g. Personalized Ayurvedic care for modern life"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={form.bio}
            onChange={(e) => updateField("bio", e.target.value)}
            placeholder="Tell your patients about your practice and approach..."
            rows={4}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={form.location}
            onChange={(e) => updateField("location", e.target.value)}
            placeholder="e.g. Austin, TX"
          />
        </div>
      </section>

      {/* Personal */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Your Profile</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile?.email || ""} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>
        </div>
      </section>

      {/* Links */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Links</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="telehealth_url">Telehealth / Booking URL</Label>
            <Input
              id="telehealth_url"
              value={form.telehealth_url}
              onChange={(e) => updateField("telehealth_url", e.target.value)}
              placeholder="e.g. https://calendly.com/..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={form.website}
              onChange={(e) => updateField("website", e.target.value)}
              placeholder="e.g. https://meenakshiayurveda.com"
            />
          </div>
        </div>
      </section>

      {/* Subscription & Billing */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Subscription & Billing</h2>

        {/* Current plan status */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium capitalize">{profile?.subscription_tier} Plan</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              profile?.subscription_active
                ? "bg-accent text-accent-foreground"
                : profile?.in_trial
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
            }`}>
              {profile?.subscription_active ? "Active" : profile?.in_trial ? "Trial" : "Inactive"}
            </span>
          </div>
          {profile?.in_trial && profile.trial_ends_at && (
            <p className="text-xs text-muted-foreground">
              Trial ends {new Date(profile.trial_ends_at).toLocaleDateString()}
            </p>
          )}
          {profile?.subscription_active && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const { data } = await billingApi.createPortalSession();
                  window.location.href = data.portal_url;
                } catch {
                  alert("Unable to open billing portal. Please try again.");
                }
              }}
            >
              Manage Billing
            </Button>
          )}
        </div>

        {/* Pricing tiers */}
        {!profile?.subscription_active && (
          <div className="grid gap-3 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.tier}
                className={`bg-card border rounded-lg p-4 space-y-2 ${
                  plan.popular ? "border-primary ring-1 ring-primary" : "border-border"
                }`}
              >
                {plan.popular && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">
                    Most Popular
                  </span>
                )}
                <h3 className="font-semibold">{plan.name}</h3>
                <p className="text-2xl font-bold">
                  ${plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {plan.features.map((f) => (
                    <li key={f}>+ {f}</li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant={plan.popular ? "default" : "outline"}
                  className="w-full"
                  onClick={async () => {
                    try {
                      const { data } = await billingApi.createCheckoutSession(plan.tier);
                      window.location.href = data.checkout_url;
                    } catch {
                      alert("Unable to start checkout. Stripe may not be configured yet.");
                    }
                  }}
                >
                  Subscribe
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Save button */}
      <div className="flex items-center gap-3 pt-2">
        <Button size="lg" disabled={saving} onClick={handleSave}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
        {saved && (
          <span className="text-sm text-accent-foreground font-medium">Saved!</span>
        )}
      </div>
    </div>
  );
}
