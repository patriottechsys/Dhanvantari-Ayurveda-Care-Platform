import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
              &#x0950;
            </div>
            <span className="font-semibold text-sm">Dhanvantari</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="text-sm bg-primary text-primary-foreground px-4 py-1.5 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center space-y-6">
        <div className="inline-flex items-center gap-2 text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
          <span>&#x0950;</span> Ayurvedic Practice Management
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight max-w-3xl mx-auto">
          The modern platform for{" "}
          <span className="text-primary">Ayurvedic practitioners</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Manage patients, create personalized care plans, track daily check-ins,
          and leverage AI — all grounded in classical Ayurvedic principles.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/login"
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Start Free Trial
          </Link>
          <Link
            href="/login"
            className="border px-6 py-2.5 rounded-lg font-medium hover:bg-muted transition-colors"
          >
            Try Demo
          </Link>
        </div>
      </section>

      {/* Features grid */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Patient Management",
              desc: "Complete profiles with Prakriti assessment, health history, and dosha analysis.",
              icon: "&#x1F9D1;&#x200D;&#x2695;&#xFE0F;",
            },
            {
              title: "Care Plans",
              desc: "Personalized supplement protocols, recipes, dietary guidance, and lifestyle recommendations.",
              icon: "&#x1F4CB;",
            },
            {
              title: "Daily Check-ins",
              desc: "Patients log habits, symptoms, and energy levels through a simple portal — no app install needed.",
              icon: "&#x2705;",
            },
            {
              title: "AI Assistant",
              desc: "Get clinical insights, draft care plans, and analyze check-in trends with AI support.",
              icon: "&#x2728;",
            },
            {
              title: "Pranayama Library",
              desc: "8+ classical breathing exercises with step-by-step technique guides and dosha effects.",
              icon: "&#x1F32C;&#xFE0F;",
            },
            {
              title: "Supplement & Recipe Library",
              desc: "Searchable database of Ayurvedic herbs and healing recipes with dosage guidance.",
              icon: "&#x1F33F;",
            },
          ].map((f) => (
            <div key={f.title} className="border rounded-xl p-5 space-y-2 bg-card">
              <span className="text-2xl" dangerouslySetInnerHTML={{ __html: f.icon }} />
              <h3 className="font-semibold text-sm">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t bg-muted/30">
        <div className="max-w-5xl mx-auto px-6 py-16 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Simple, transparent pricing</h2>
            <p className="text-sm text-muted-foreground">Start with a 14-day free trial. No credit card required.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 max-w-3xl mx-auto">
            {[
              { name: "Seed", price: 49, features: ["Up to 30 patients", "Care plans & check-ins", "Email support"], popular: false },
              { name: "Practice", price: 89, features: ["Unlimited patients", "AI plan drafts & insights", "Priority support"], popular: true },
              { name: "Clinic", price: 149, features: ["Multi-practitioner", "All Practice features", "Custom branding"], popular: false },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`bg-card border rounded-xl p-5 space-y-3 ${
                  plan.popular ? "border-primary ring-1 ring-primary" : "border-border"
                }`}
              >
                {plan.popular && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">
                    Most Popular
                  </span>
                )}
                <h3 className="font-semibold">{plan.name}</h3>
                <p className="text-3xl font-bold">
                  ${plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
                <ul className="text-xs text-muted-foreground space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5">
                      <span className="text-primary">+</span> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`block text-center text-sm py-2 rounded-lg font-medium transition-opacity ${
                    plan.popular
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "border hover:bg-muted"
                  }`}
                >
                  Start Free Trial
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">Dhanvantari</span>
            <span>Ayurvedic Practice Platform</span>
          </div>
          <span>&copy; {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
