import { useMemo } from "react";
import { ArrowRight, Check, HelpCircle, X, AlertTriangle, Loader2 } from "lucide-react";

import { useFinder } from "@/lib/finder-context";
import { cn } from "@/lib/utils";

import { DynIcon } from "./bits";

export function Symptoms() {
  const f = useFinder();
  const selected = f.symptomIds;
  const symptoms = useMemo(() => {
    if (!f.bootstrap || f.bootstrap.status !== "ok") return [];
    return [...f.bootstrap.symptoms].sort((a, b) => a.display_order - b.display_order);
  }, [f.bootstrap]);

  if (f.bootstrapLoading) return <LoadingBlock label="Loading symptoms…" />;
  if (f.bootstrap?.status !== "ok") return null; // handled by CatalogueGuard

  return (
    <div className="space-y-8">
      <div className="max-w-3xl">
        <h1 className="font-display text-3xl font-semibold md:text-4xl">
          What is bothering you?
        </h1>
        <p className="mt-2 text-muted-foreground">
          Select all that apply. We&apos;ll show product categories that match.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {symptoms.map((s) => {
          const active = selected.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => f.toggleSymptom(s.id)}
              aria-pressed={active}
              aria-label={s.name}
              className={cn(
                "surface-card group relative flex min-h-[168px] flex-col items-start gap-3 p-6 text-left transition-all",
                "hover:-translate-y-0.5 hover:shadow-elevated",
                active && "border-primary bg-primary-soft ring-2 ring-primary/40",
              )}
            >
              <div
                className={cn(
                  "grid h-14 w-14 place-items-center rounded-2xl transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary-soft text-primary",
                )}
              >
                <DynIcon name={s.icon} className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <div className="font-display text-xl font-semibold">{s.name}</div>
                {s.customer_description && (
                  <div className="mt-1 text-sm text-muted-foreground">
                    {s.customer_description}
                  </div>
                )}
              </div>
              <span
                className={cn(
                  "absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full border transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface",
                )}
              >
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
              <div className="mt-1 text-sm text-muted-foreground">
                Pick one or more symptoms above.
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selected.map((id) => {
                  const s = f.symptomsById.get(id);
                  if (!s) return null;
                  return (
                    <button
                      key={id}
                      onClick={() => f.toggleSymptom(id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                    >
                      {s.name}
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
              onClick={() => f.go("categories")}
              disabled={selected.length === 0}
              aria-disabled={selected.length === 0}
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

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="surface-card flex items-center justify-center gap-3 p-16 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

// Kept for other screens that want a bare warning slot.
export function InlineWarning({ message }: { message: string }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-2xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground/90">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {message}
    </div>
  );
}
