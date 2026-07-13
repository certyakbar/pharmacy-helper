import { useMemo } from "react";
import { ArrowRight, HelpCircle, Layers, Loader2 } from "lucide-react";

import { useFinder } from "@/lib/finder-context";
import { useProductSearch } from "@/lib/finder/hooks";
import type { SearchRequest } from "@/lib/finder/schemas";
import { cn } from "@/lib/utils";

import { BackBar } from "./AppShell";
import { DynIcon, SymptomChip } from "./bits";

export function Categories() {
  const f = useFinder();

  const request: SearchRequest | null = useMemo(() => {
    if (f.symptomIds.length === 0) return null;
    return {
      symptomIds: [...f.symptomIds],
      inStockOnly: false,
      sort: "best_match",
    };
  }, [f.symptomIds]);

  const q = useProductSearch(request, f.catalogueVersionId);

  const relevant = useMemo(() => {
    if (!q.data || q.data.status !== "ok") return [];
    return q.data.relevant_display_groups
      .filter((g) => g.relevance_score > 0 && g.available_product_count > 0)
      .sort(
        (a, b) =>
          b.relevance_score - a.relevance_score ||
          a.name.localeCompare(b.name),
      );
  }, [q.data]);

  const totalProducts = q.data && q.data.status === "ok" ? q.data.total : 0;
  const topScore = relevant[0]?.relevance_score ?? 0;

  return (
    <div>
      <BackBar to="symptoms" label="Back to symptoms" />

      <div className="mb-8 max-w-3xl">
        <h1 className="font-display text-3xl font-semibold md:text-4xl">
          Relevant product categories
        </h1>
        <p className="mt-2 text-muted-foreground">
          Based on your{" "}
          <strong className="text-foreground">{f.symptomIds.length}</strong>{" "}
          selected symptom{f.symptomIds.length > 1 ? "s" : ""}.
        </p>
        {f.symptomIds.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {f.symptomIds.map((id) => (
              <SymptomChip key={id} symptomId={id} />
            ))}
          </div>
        )}
      </div>

      {q.isLoading && !q.data ? (
        <div className="surface-card flex items-center justify-center gap-3 p-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Finding
          matching categories…
        </div>
      ) : q.data?.status !== "ok" ? (
        <UnavailableBlock />
      ) : relevant.length === 0 ? (
        <EmptyBlock onHelp={() => f.go("help")} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {relevant.map((g) => {
            const emphasised = g.relevance_score === topScore;
            return (
              <div
                key={g.id}
                className={cn(
                  "surface-card flex flex-col gap-4 p-6 transition-all hover:-translate-y-0.5 hover:shadow-elevated",
                  emphasised && "border-primary ring-2 ring-primary/30",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
                    <DynIcon
                      name={f.displayGroupsById.get(g.id)?.icon ?? null}
                      className="h-7 w-7"
                    />
                  </div>
                  {emphasised && (
                    <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                      Best match
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="font-display text-2xl font-semibold">{g.name}</h2>
                  {g.customer_description && (
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {g.customer_description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {g.matched_symptom_ids.slice(0, 4).map((sid) => (
                    <SymptomChip key={sid} symptomId={sid} />
                  ))}
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
                  <div className="text-sm text-muted-foreground">
                    <strong className="text-foreground">
                      {g.available_product_count}
                    </strong>{" "}
                    product{g.available_product_count !== 1 ? "s" : ""}
                  </div>
                  <button
                    onClick={() => {
                      f.setDisplayGroup(g.id);
                      f.go("products");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    View products <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {q.data?.status === "ok" && totalProducts > 0 && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => {
              f.setDisplayGroup(null);
              f.go("products");
            }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-6 py-3 text-sm font-medium hover:border-primary/40"
          >
            <Layers className="h-4 w-4" /> All matching products ({totalProducts})
          </button>
        </div>
      )}
    </div>
  );
}

function UnavailableBlock() {
  return (
    <div className="surface-card flex flex-col items-center gap-3 p-12 text-center">
      <h3 className="font-display text-xl font-semibold">
        Product information is temporarily unavailable
      </h3>
      <p className="max-w-md text-sm text-muted-foreground">
        Please ask the pharmacy team for help.
      </p>
    </div>
  );
}

function EmptyBlock({ onHelp }: { onHelp: () => void }) {
  return (
    <div className="surface-card flex flex-col items-center gap-3 p-12 text-center">
      <h3 className="font-display text-xl font-semibold">
        No matching categories available
      </h3>
      <p className="max-w-md text-sm text-muted-foreground">
        We couldn&apos;t find matching products in the current catalogue. The
        pharmacy team can help you choose.
      </p>
      <button
        onClick={onHelp}
        className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
      >
        <HelpCircle className="h-4 w-4" /> Ask the pharmacy team
      </button>
    </div>
  );
}
