import { useFinder } from "@/lib/finder-context";
import { ArrowRight, HelpCircle, ShieldAlert, Sparkles } from "lucide-react";

export function Welcome() {
  const f = useFinder();
  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-center">
      <div className="space-y-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="h-3.5 w-3.5" /> In-store product finder
        </span>
        <h1 className="font-display text-4xl font-semibold leading-tight text-foreground md:text-5xl lg:text-6xl">
          Find products for your symptoms.
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Select what is bothering you and explore relevant over-the-counter product options available in this pharmacy.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => f.go("symptoms")}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-elevated transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Start <ArrowRight className="h-5 w-5" />
          </button>
          <button
            onClick={() => f.go("help")}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface px-8 py-4 text-base font-semibold hover:border-primary/40"
          >
            <HelpCircle className="h-5 w-5" /> Ask the pharmacy team
          </button>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning-foreground" />
          <p className="text-warning-foreground/90">
            This tool helps you explore products. <strong>It does not diagnose conditions.</strong> Speak to the pharmacy team if you are unsure.
          </p>
        </div>

        <div className="flex items-center gap-2 pt-4">
          {["Symptoms", "Categories", "Products"].map((label, i, arr) => (
            <div key={label} className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                {i + 1}
              </span>
              <span className="text-sm font-medium">{label}</span>
              {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-primary-soft via-transparent to-accent-soft blur-2xl opacity-70" />
        <div className="relative grid grid-cols-2 gap-4">
          {[
            { emoji: "💊", label: "Tablets", tone: "bg-primary-soft" },
            { emoji: "🧴", label: "Nasal sprays", tone: "bg-accent-soft" },
            { emoji: "💧", label: "Eye drops", tone: "bg-secondary" },
            { emoji: "🌼", label: "Hay fever ready", tone: "bg-surface-2" },
          ].map((c, i) => (
            <div
              key={c.label}
              className={`surface-card flex aspect-square flex-col items-center justify-center gap-3 p-6 ${c.tone} ${i % 2 ? "translate-y-6" : ""}`}
            >
              <div className="text-6xl">{c.emoji}</div>
              <div className="font-display text-lg font-semibold">{c.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
