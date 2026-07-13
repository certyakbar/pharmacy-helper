import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Filter,
  Loader2,
  PackageOpen,
  Scale,
  SlidersHorizontal,
} from "lucide-react";

import { toCompareSnapshot, useFinder, type SortKey } from "@/lib/finder-context";
import { useProductSearch } from "@/lib/finder/hooks";
import type {
  ProductMatch,
  SearchRequest,
  SortOption,
} from "@/lib/finder/schemas";
import { cn } from "@/lib/utils";

import { BackBar } from "./AppShell";
import { DynIcon, ShelfLocation, StockBadge, SymptomChip, formulationLabel } from "./bits";

const SORT_OPTIONS: { v: SortOption; l: string }[] = [
  { v: "best_match", l: "Best match for selected symptoms" },
  { v: "price_low_to_high", l: "Price: low to high" },
  { v: "price_high_to_low", l: "Price: high to low" },
  { v: "pack_size", l: "Pack size" },
];

export function Products() {
  const f = useFinder();
  const [filtersOpen, setFiltersOpen] = useState(true);

  const request: SearchRequest | null = useMemo(() => {
    if (f.symptomIds.length === 0) return null;
    return {
      symptomIds: [...f.symptomIds],
      displayGroupId: f.displayGroupId ?? undefined,
      formulation:
        f.filters.formulation !== "all"
          ? (f.filters.formulation as SearchRequest["formulation"])
          : undefined,
      maxPrice: f.filters.priceMax ?? undefined,
      inStockOnly: f.filters.inStockOnly,
      sort: f.sort,
    };
  }, [
    f.symptomIds,
    f.displayGroupId,
    f.filters.formulation,
    f.filters.priceMax,
    f.filters.inStockOnly,
    f.sort,
  ]);

  const q = useProductSearch(request, f.catalogueVersionId);
  const products: ProductMatch[] = q.data?.status === "ok" ? q.data.products : [];
  const activeGroup = f.displayGroupId ? f.displayGroupsById.get(f.displayGroupId) : null;

  return (
    <div>
      <BackBar to="categories" label="Back to categories" />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold md:text-4xl">
            {activeGroup ? activeGroup.name : "All matching products"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {q.isLoading && !q.data
              ? "Loading products…"
              : `${products.length} product${products.length !== 1 ? "s" : ""} shown`}
            {" · These products are commonly used for the symptoms you selected."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-xs font-medium text-muted-foreground">
            Sort
          </label>
          <select
            id="sort-select"
            value={f.sort}
            onChange={(e) => f.setSort(e.target.value as SortKey)}
            className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium focus:border-primary focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.v} value={o.v}>
                {o.l}
              </option>
            ))}
          </select>
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-sm font-medium lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className={cn("space-y-5", !filtersOpen && "hidden lg:block")}>
          <div className="surface-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <h3 className="font-display text-lg font-semibold">Filters</h3>
            </div>

            <FilterGroup label="Category">
              <PillRow
                options={[
                  { v: "all", l: "All" },
                  ...[...f.displayGroupsById.values()]
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((g) => ({ v: g.id, l: g.name })),
                ]}
                value={f.displayGroupId ?? "all"}
                onChange={(v) => f.setDisplayGroup(v === "all" ? null : v)}
              />
            </FilterGroup>

            <FilterGroup label="Formulation">
              <PillRow
                options={[
                  { v: "all", l: "All" },
                  ...f.formulations.map((v) => ({ v, l: formulationLabel(v) })),
                ]}
                value={f.filters.formulation}
                onChange={(v) => f.setFilters({ formulation: v })}
              />
            </FilterGroup>

            <FilterGroup
              label={
                f.filters.priceMax === null
                  ? "Price: any"
                  : `Price up to £${f.filters.priceMax.toFixed(2)}`
              }
            >
              <input
                type="range"
                min={2}
                max={30}
                step={0.5}
                value={f.filters.priceMax ?? 30}
                onChange={(e) =>
                  f.setFilters({
                    priceMax: Number(e.target.value) >= 30 ? null : Number(e.target.value),
                  })
                }
                className="w-full accent-[color:var(--color-primary)]"
              />
            </FilterGroup>

            <label className="mt-2 flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm">
              <span className="font-medium">In stock only</span>
              <input
                type="checkbox"
                checked={f.filters.inStockOnly}
                onChange={(e) => f.setFilters({ inStockOnly: e.target.checked })}
                className="h-4 w-4 accent-[color:var(--color-primary)]"
              />
            </label>

            <button
              onClick={() => {
                f.setDisplayGroup(null);
                f.setFilters({ formulation: "all", priceMax: null, inStockOnly: false });
              }}
              className="mt-4 w-full text-sm font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Clear all filters
            </button>
          </div>
        </aside>

        <div>
          {q.isLoading && !q.data ? (
            <LoadingBlock label="Loading products…" />
          ) : q.data?.status !== "ok" ? (
            <UnavailableBlock />
          ) : products.length === 0 ? (
            <EmptyState
              onClear={() => {
                f.setDisplayGroup(null);
                f.setFilters({ formulation: "all", priceMax: null, inStockOnly: false });
              }}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {products.map((m) => (
                <ProductCard key={m.catalogue_version_item_id} m={m} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border first:border-t-0 py-3 first:pt-0">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

function PillRow({
  options,
  value,
  onChange,
}: {
  options: { v: string; l: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            value === o.v
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-surface hover:border-primary/40",
          )}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function ProductCard({ m }: { m: ProductMatch }) {
  const f = useFinder();
  const inCompare = f.compareIds.includes(m.catalogue_version_item_id);
  const p = m.product;
  const snap = toCompareSnapshot(p, m.effective_price, f.catalogueVersionId ?? "");
  const showPromo =
    p.promotional_price !== null && p.promotional_price < p.price;

  return (
    <div className="surface-card group flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-elevated">
      <div className="relative flex h-44 items-center justify-center bg-gradient-to-br from-primary-soft to-surface-2">
        {p.image_url ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <img
            src={p.image_url}
            alt={p.product_name}
            className="max-h-full max-w-full object-contain p-4"
          />
        ) : (
          <div className="text-7xl">💊</div>
        )}
        <div className="absolute right-3 top-3">
          <StockBadge status={p.stock_status} qty={p.stock_quantity} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-lg font-semibold leading-snug">
          {p.product_name}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{p.active_ingredient}</p>

        <div className="mt-3 flex flex-wrap gap-1 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-0.5">
            {formulationLabel(p.formulation)}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5">{p.pack_size}</span>
        </div>

        {m.match_reason.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {m.match_reason.slice(0, 2).map((r) => (
              <span
                key={r.display_group_id}
                className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-foreground"
              >
                Related to {r.display_group_name}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-1">
          {m.matched_symptom_ids.slice(0, 3).map((sid) => (
            <SymptomChip key={sid} symptomId={sid} />
          ))}
        </div>

        <div className="mt-4 border-t border-border pt-3">
          <ShelfLocation aisle={p.aisle} bay={p.bay} shelf={p.shelf} />
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            {showPromo ? (
              <div>
                <div className="font-display text-2xl font-bold">
                  £{p.promotional_price!.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground line-through">
                  £{p.price.toFixed(2)}
                </div>
              </div>
            ) : (
              <div className="font-display text-2xl font-bold">£{p.price.toFixed(2)}</div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => f.toggleCompare(snap)}
              disabled={!inCompare && f.compareIds.length >= 3}
              aria-pressed={inCompare}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                inCompare
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed",
              )}
            >
              {inCompare ? <Check className="h-3.5 w-3.5" /> : <Scale className="h-3.5 w-3.5" />}
              {inCompare ? "In compare" : "Compare"}
            </button>
            <button
              onClick={() => f.openDetail(m.catalogue_version_item_id)}
              className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:opacity-90"
            >
              View details <ArrowRight className="h-3.5 w-3.5" />
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

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="surface-card flex flex-col items-center justify-center gap-3 p-12 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-muted">
        <PackageOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-display text-xl font-semibold">
        No products match those filters
      </h3>
      <p className="max-w-md text-sm text-muted-foreground">
        Try widening your price range or asking the pharmacy team for guidance.
      </p>
      <button
        onClick={onClear}
        className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Clear filters
      </button>
    </div>
  );
}
