import { useFinder } from "@/lib/finder-context";
import { SYMPTOMS } from "@/lib/finder-data";
import { ArrowRight, Check, HelpCircle, PackageSearch, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DynIcon } from "./bits";

export function Symptoms() {
  const f = useFinder();
  const selected = f.symptoms;

  return (
    <div className="space-y-8">
      <div className="max-w-3xl">
        <h1 className="font-display text-3xl font-semibold md:text-4xl">What is bothering you?</h1>
        <p className="mt-2 text-muted-foreground">
          Select all that apply. We&apos;ll show product categories that match. You can skip this and go straight to a product type.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SYMPTOMS.map((s) => {
          const active = selected.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => f.toggleSymptom(s.id)}
              aria-pressed={active}
              className={cn(
                "surface-card group relative flex min-h-[168px] flex-col items-start gap-3 p-6 text-left transition-all",
                "hover:-translate-y-0.5 hover:shadow-elevated",
                active && "border-primary bg-primary-soft ring-2 ring-primary/40",
              )}
            >
              <div className={cn(
                "grid h-14 w-14 place-items-center rounded-2xl transition-colors",
                active ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary",
              )}>
                <DynIcon name={s.icon} className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <div className="font-display text-xl font-semibold">{s.label}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.description}</div>
              </div>
              <span className={cn(
                "absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full border transition-colors",
                active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface",
              )}>
                {active && <Check className="h-4 w-4" />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="sticky bottom-4 z-30">
        <div className="surface-card mx-auto flex flex-col gap-3 p-4 md:flex-row md:items-center md:gap-4 md:p-5">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Selected {selected.length > 0 && `(${selected.length})`}
            </div>
            {selected.length === 0 ? (
              <div className="mt-1 text-sm text-muted-foreground">Pick one or more symptoms above.</div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selected.map((id) => {
                  const s = SYMPTOMS.find((x) => x.id === id)!;
                  return (
                    <button
                      key={id}
                      onClick={() => f.toggleSymptom(id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                    >
                      {s.label}
                      <X className="h-3 w-3 opacity-80" />
                    </button>
                  );
                })}
                <button
                  onClick={f.clearSymptoms}
                  className="text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => f.go("help")}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium hover:border-primary/40"
            >
              <HelpCircle className="h-4 w-4" /> Ask pharmacy team
            </button>
            <button
              onClick={() => { f.setFocusCategory("all"); f.go("products"); }}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium hover:border-primary/40"
            >
              <PackageSearch className="h-4 w-4" /> I know the product type
            </button>
            <button
              onClick={() => f.go("categories")}
              disabled={selected.length === 0}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors",
                selected.length === 0
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-card",
              )}
            >
              Show matching categories <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
