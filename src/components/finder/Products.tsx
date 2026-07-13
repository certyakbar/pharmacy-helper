import { useFinder, type SortKey } from "@/lib/finder-context";
import { CATEGORIES, PRODUCTS, SYMPTOMS, type Product } from "@/lib/finder-data";
import { ArrowRight, Check, Filter, PackageOpen, Scale, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BackBar } from "./AppShell";
import { DynIcon, ShelfLocation, StockBadge, SymptomChip, categoryMeta } from "./bits";
import { useState } from "react";

const FORMULATIONS = ["all", "tablet", "spray", "drops", "liquid"];

export function Products() {
  const f = useFinder();
  const products = f.filteredSortedProducts;
  const [filtersOpen, setFiltersOpen] = useState(true);

  return (
    <div>
      <BackBar to="categories" label="Back to categories" />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold md:text-4xl">
            {f.filters.category === "all" ? "All matching products" : categoryMeta(f.filters.category).name}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {products.length} product{products.length !== 1 ? "s" : ""} shown ·{" "}
            {f.symptoms.length > 0 ? `matched to ${f.symptoms.length} symptom${f.symptoms.length > 1 ? "s" : ""}` : "showing full range"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">Sort</label>
          <select
            value={f.sort}
            onChange={(e) => f.setSort(e.target.value as SortKey)}
            className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium focus:border-primary focus:outline-none"
          >
            <option value="best">Best match for selected symptoms</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="pack">Pack size</option>
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
                options={[{ v: "all", l: "All" }, ...CATEGORIES.map((c) => ({ v: c.id, l: c.name }))]}
                value={f.filters.category}
                onChange={(v) => f.setFilters({ category: v as any })}
              />
            </FilterGroup>

            <FilterGroup label="Symptoms">
              <div className="flex flex-wrap gap-1.5">
                {SYMPTOMS.map((s) => (
                  <SymptomChip
                    key={s.id}
                    id={s.id}
                    active={f.filters.symptoms.includes(s.id)}
                    onClick={() =>
                      f.setFilters({
                        symptoms: f.filters.symptoms.includes(s.id)
                          ? f.filters.symptoms.filter((x) => x !== s.id)
                          : [...f.filters.symptoms, s.id],
                      })
                    }
                  />
                ))}
              </div>
            </FilterGroup>

            <FilterGroup label="Formulation">
              <PillRow
                options={FORMULATIONS.map((v) => ({ v, l: v === "all" ? "All" : v[0].toUpperCase() + v.slice(1) }))}
                value={f.filters.formulation}
                onChange={(v) => f.setFilters({ formulation: v })}
              />
            </FilterGroup>

            <FilterGroup label={`Price up to £${f.filters.priceMax.toFixed(2)}`}>
              <input
                type="range" min={2} max={15} step={0.5}
                value={f.filters.priceMax}
                onChange={(e) => f.setFilters({ priceMax: Number(e.target.value) })}
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
              onClick={() =>
                f.setFilters({
                  category: "all", symptoms: [], formulation: "all", priceMax: 15, inStockOnly: false,
                })
              }
              className="mt-4 w-full text-sm font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Clear all filters
            </button>
          </div>
        </aside>

        <div>
          {products.length === 0 ? (
            <EmptyState onClear={() => f.setFilters({ category: "all", symptoms: [], formulation: "all", priceMax: 15, inStockOnly: false })} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {products.map((p) => <ProductCard key={p.id} p={p} />)}
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
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function PillRow({ options, value, onChange }: { options: { v: string; l: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            value === o.v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface hover:border-primary/40",
          )}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function ProductCard({ p }: { p: Product }) {
  const f = useFinder();
  const inCompare = f.compareIds.includes(p.id);
  const cat = categoryMeta(p.category);

  return (
    <div className="surface-card group flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-elevated">
      <div className="relative flex h-44 items-center justify-center bg-gradient-to-br from-primary-soft to-surface-2">
        <div className="text-7xl transition-transform group-hover:scale-110">{p.image}</div>
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-medium backdrop-blur">
          <DynIcon name={cat.icon} className="h-3.5 w-3.5 text-primary" />
          {cat.name}
        </span>
        <div className="absolute right-3 top-3">
          <StockBadge status={p.stockStatus} qty={p.stockStatus === "low-stock" ? p.stockQuantity : undefined} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-lg font-semibold leading-snug">{p.productName}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{p.activeIngredient}</p>

        <div className="mt-3 flex flex-wrap gap-1 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-0.5">{p.formulation}</span>
          <span className="rounded-full bg-muted px-2 py-0.5">{p.packSize}</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {p.badges.slice(0, 2).map((b) => (
            <span key={b} className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
              {b}
            </span>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {p.symptoms.slice(0, 3).map((s) => <SymptomChip key={s} id={s} />)}
        </div>

        <div className="mt-4 border-t border-border pt-3">
          <ShelfLocation aisle={p.aisle} bay={p.bay} shelf={p.shelf} />
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <div className="font-display text-2xl font-bold">£{p.price.toFixed(2)}</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => f.toggleCompare(p.id)}
              disabled={!inCompare && f.compareIds.length >= 3}
              aria-pressed={inCompare}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                inCompare ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed",
              )}
            >
              {inCompare ? <Check className="h-3.5 w-3.5" /> : <Scale className="h-3.5 w-3.5" />}
              {inCompare ? "In compare" : "Compare"}
            </button>
            <button
              onClick={() => f.openDetail(p.id)}
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

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="surface-card flex flex-col items-center justify-center gap-3 p-12 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-muted">
        <PackageOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-display text-xl font-semibold">No products match those filters</h3>
      <p className="max-w-md text-sm text-muted-foreground">
        Try widening your price range, removing symptom filters, or asking the pharmacy team for guidance.
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
