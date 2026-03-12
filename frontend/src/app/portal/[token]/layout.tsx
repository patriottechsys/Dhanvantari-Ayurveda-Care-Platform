import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Wellness Portal — Dhanvantari",
  description: "Track your daily Ayurvedic habits and wellness progress",
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Simple branded header */}
      <header className="border-b bg-card">
        <div className="max-w-2xl mx-auto flex items-center gap-2.5 px-4 h-14">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0">
            ॐ
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight">Dhanvantari</p>
            <p className="text-xs text-muted-foreground">My Wellness Portal</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {children}
      </main>

      <footer className="border-t mt-12">
        <div className="max-w-2xl mx-auto px-4 py-6 text-center text-xs text-muted-foreground">
          <p>Powered by Dhanvantari Ayurveda Care Platform</p>
        </div>
      </footer>
    </div>
  );
}
