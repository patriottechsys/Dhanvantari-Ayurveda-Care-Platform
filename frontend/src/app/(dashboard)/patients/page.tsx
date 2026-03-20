"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { UserPlus, Search, ExternalLink } from "lucide-react";
import { patientsApi } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { DoshaBadge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

type Patient = {
  id: number;
  full_name: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  dob?: string;
  dosha_primary?: string;
  checkin_token?: string;
  created_at: string;
};

const PORTAL_BASE = typeof window !== "undefined" ? window.location.origin : "";

export default function PatientsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: ["patients"],
    queryFn: () => patientsApi.list().then((r) => r.data),
  });

  const filtered = patients.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.includes(search)
  );

  // Add patient form state
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    dob: "", sex: "", location: "", occupation: "",
  });
  const [formError, setFormError] = useState("");

  const addMutation = useMutation({
    mutationFn: (data: typeof form) => patientsApi.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      setAddOpen(false);
      setForm({ first_name: "", last_name: "", email: "", phone: "", dob: "", sex: "", location: "", occupation: "" });
      router.push(`/patients/${res.data.id}`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed to add patient.";
      setFormError(typeof msg === "string" ? msg : JSON.stringify(msg));
    },
  });

  function calcAge(dob?: string) {
    if (!dob) return null;
    const years = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400000));
    return `${years}y`;
  }

  return (
    <div className="p-6 space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{patients.length} active patients</p>
        </div>
        <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5">
          <UserPlus className="size-4" />
          Add Patient
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground py-12 text-center">Loading…</div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">Patient</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs hidden sm:table-cell">Contact</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs hidden md:table-cell">Age</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs hidden lg:table-cell">Dosha</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs hidden lg:table-cell">Added</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/patients/${p.id}`)}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
                        {p.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium truncate max-w-[160px]">{p.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    <div className="truncate max-w-[180px]">{p.email ?? p.phone ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {calcAge(p.dob) ?? "—"}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <DoshaBadge dosha={p.dosha_primary} />
                    {!p.dosha_primary && <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                    {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {p.checkin_token && (
                      <a
                        href={`${PORTAL_BASE}/portal/${p.checkin_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open patient portal"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {search ? "No patients match your search." : "No patients yet. Add your first patient."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Patient Dialog */}
      <Dialog
        open={addOpen}
        onClose={() => { setAddOpen(false); setFormError(""); }}
        title="Add New Patient"
        description="Required: first and last name. Everything else can be added later."
        className="max-w-lg"
      >
        <form
          onSubmit={(e) => { e.preventDefault(); setFormError(""); addMutation.mutate(form); }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fn">First name *</Label>
              <Input id="fn" value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ln">Last name *</Label>
              <Input id="ln" value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dob">Date of birth</Label>
              <Input id="dob" type="date" value={form.dob} onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sex">Sex</Label>
              <Select id="sex" value={form.sex} onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value }))}>
                <option value="">Select…</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="Other">Other</option>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input id="location" placeholder="City, State" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          </div>
          {formError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{formError}</p>
          )}
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending ? "Adding…" : "Add Patient"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
