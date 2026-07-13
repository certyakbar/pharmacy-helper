import { ArrowRight, CheckCircle2, HelpCircle, MessageSquare, X } from "lucide-react";

import { useFinder, type CompareSnapshot } from "@/lib/finder-context";

import { SymptomChip, formulationLabel } from "./bits";

export function PharmacyHelp() {
  const f = useFinder();
  const shortlist: CompareSnapshot[] = f.compareIds
    .map((id) => f.compareSnapshots[id])
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="surface-card overflow-hidden">
        <div className="relative bg-gradient-to-br from-primary via-primary to-[color:var(--color-accent)] p-8 text-primary-foreground">
          <button
            onClick={() =>
              f.go(f.previousStep === "help" ? "welcome" : f.previousStep)
            }
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <HelpCircle className="h-3.5 w-3.5" /> Pharmacy team handover
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
            Need help choosing?
          </h1>
          <p className="mt-1.5 max-w-lg text-primary-foreground/90">
            Please speak to a member of the pharmacy team.
          </p>
        </div>

        <div className="space-y-6 p-6 md:p-8">
          <div className="flex items-start gap-4 rounded-2xl border border-dashed border-primary/40 bg-primary-soft p-5">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <MessageSquare className="h-8 w-8" />
            </div>
            <div>
              <div className="font-display text-lg font-semibold text-primary">
                Please speak to a member of the pharmacy team.
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                They can review the symptoms and shortlisted products below and
                help you choose the right option.
              </p>
            </div>
          </div>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Selected symptoms
            </h2>
            {f.symptomIds.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                None selected yet.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {f.symptomIds.map((id) => (
                  <SymptomChip key={id} symptomId={id} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Current shortlist
            </h2>
            {shortlist.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Nothing added to compare yet.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-border rounded-2xl border border-border bg-surface">
                {shortlist.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 p-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-2xl">
                      {p.imageUrl ? (
                        // eslint-disable-next-line jsx-a11y/alt-text
                        <img
                          src={p.imageUrl}
                          alt={p.productName}
                          className="max-h-full max-w-full object-contain p-1"
                        />
                      ) : (
                        "💊"
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">
                        {p.productName}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {formulationLabel(p.formulation)} · £{p.effectivePrice.toFixed(2)}
                        {p.aisle ? ` · Aisle ${p.aisle}` : ""}
                        {p.bay ? ` · Bay ${p.bay}` : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="rounded-2xl bg-surface-2 p-4 text-sm">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-success" /> What happens next
            </div>
            <ol className="mt-2 ml-6 list-decimal space-y-1 text-muted-foreground">
              <li>Head to the pharmacy counter.</li>
              <li>Let a team member know you were using the product finder.</li>
              <li>
                They&apos;ll help you choose the best option for you.
              </li>
            </ol>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() =>
                f.go(f.previousStep === "help" ? "products" : f.previousStep)
              }
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold hover:border-primary/40"
            >
              Continue browsing <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => f.resetAll()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background hover:opacity-90"
            >
              Finish session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
