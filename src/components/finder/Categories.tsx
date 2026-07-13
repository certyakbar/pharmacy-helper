import { useFinder } from "@/lib/finder-context";
import { PRODUCTS, relevantCategories, SYMPTOMS } from "@/lib/finder-data";
import { ArrowRight, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { BackBar } from "./AppShell";
import { DynIcon, SymptomChip } from "./bits";

export function Categories() {
  const f = useFinder();
  const cats = relevantCategories(f.symptoms);
  const topScore = cats[0]?.score ?? 0;

  return (
    <div>
      <BackBar to="symptoms" label="Back to symptoms" />

      <div className="mb-8 max-w-3xl">
        <h1 className="font-display text-3xl font-semibold md:text-4xl">Relevant product categories</h1>
        <p className="mt-2 text-muted-foreground">
          Based on {f.symptoms.length > 0 ? (
            <>your <strong className="text-foreground">{f.symptoms.length}</strong> selected symptom{f.symptoms.length > 1 ? "s" : ""}.</>
          ) : "all common hay fever symptoms."}
        </p>
        {f.symptoms.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {f.symptoms.map((id) => <SymptomChip key={id} id={id} />)}
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {cats.map(({ cat, score, count }) => {
          const emphasised = score > 0 && score === topScore && f.symptoms.length > 0;
          const matchingSymptoms = f.symptoms.length > 0
            ? cat.symptoms.filter((s) => f.symptoms.includes(s))
            : cat.symptoms;
          return (
            <div
              key={cat.id}
              className={cn(
                "surface-card flex flex-col gap-4 p-6 transition-all hover:-translate-y-0.5 hover:shadow-elevated",
                emphasised && "border-primary ring-2 ring-primary/30",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <DynIcon name={cat.icon} className="h-7 w-7" />
                </div>
                {emphasised && (
                  <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                    Best match
                  </span>
                )}
              </div>
              <div>
                <h2 className="font-display text-2xl font-semibold">{cat.name}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{cat.blurb}</p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {matchingSymptoms.slice(0, 4).map((id) => <SymptomChip key={id} id={id} />)}
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
                <div className="text-sm text-muted-foreground">
                  <strong className="text-foreground">{count}</strong> product{count !== 1 ? "s" : ""}
                </div>
                <button
                  onClick={() => { f.setFocusCategory(cat.id); f.go("products"); }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  View products <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-center">
        <button
          onClick={() => { f.setFocusCategory("all"); f.go("products"); }}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-6 py-3 text-sm font-medium hover:border-primary/40"
        >
          <Layers className="h-4 w-4" /> All matching products ({PRODUCTS.length})
        </button>
      </div>
    </div>
  );
}
