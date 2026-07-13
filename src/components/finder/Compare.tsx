import { Scale, Trash2, X } from "lucide-react";

import { useFinder, type CompareSnapshot } from "@/lib/finder-context";

import { BackBar } from "./AppShell";
import { ShelfLocation, StockBadge, formulationLabel } from "./bits";

export function Compare() {
  const f = useFinder();
  const items: CompareSnapshot[] = f.compareIds
    .map((id) => f.compareSnapshots[id])
    .filter(Boolean);

  if (items.length === 0) {
    return (
      <div>
        <BackBar to="products" />
        <div className="surface-card flex flex-col items-center gap-3 p-12 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-muted">
            <Scale className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="font-display text-2xl font-semibold">
            Nothing to compare yet
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Add up to 3 products from the product listing or a product page to
            compare them side by side.
          </p>
          <button
            onClick={() => f.go("products")}
            className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Browse products
          </button>
        </div>
      </div>
    );
  }

  const rows: { label: string; render: (p: CompareSnapshot) => React.ReactNode }[] = [
    {
      label: "Price",
      render: (p) => (
        <span className="font-display text-2xl font-bold">
          £{p.effectivePrice.toFixed(2)}
        </span>
      ),
    },
    { label: "Brand", render: (p) => p.brandName ?? "—" },
    { label: "Active ingredient", render: (p) => p.activeIngredient },
    { label: "Formulation", render: (p) => formulationLabel(p.formulation) },
    { label: "Pack size", render: (p) => p.packSize },
    {
      label: "Drowsiness",
      render: (p) =>
        p.drowsinessLevel === "none"
          ? "Non-drowsy"
          : p.drowsinessLevel === "low"
            ? "Low risk"
            : "May cause drowsiness",
    },
    { label: "Stock", render: (p) => <StockBadge status={p.stockStatus} /> },
    {
      label: "Shelf location",
      render: (p) => <ShelfLocation aisle={p.aisle} bay={p.bay} shelf={p.shelf} />,
    },
    {
      label: "Ask staff first",
      render: (p) => (p.requiresStaffHelp ? "Yes" : "No"),
    },
  ];

  return (
    <div>
      <BackBar to="products" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold md:text-4xl">
            Compare products
          </h1>
          <p className="mt-1 text-muted-foreground">Up to 3 products, side by side.</p>
        </div>
        <button
          onClick={f.clearCompare}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-muted-foreground hover:border-destructive/40 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" /> Clear all
        </button>
      </div>

      <div className="overflow-x-auto">
        <div
          className="grid min-w-[720px]"
          style={{ gridTemplateColumns: `180px repeat(${items.length}, minmax(220px, 1fr))` }}
        >
          <div />
          {items.map((p) => (
            <div key={p.id} className="surface-card m-1 flex flex-col gap-3 p-4">
              <div className="relative">
                <button
                  onClick={() => f.toggleCompare(p)}
                  aria-label="Remove"
                  className="absolute right-0 top-0 rounded-full border border-border bg-surface p-1 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="grid h-32 place-items-center rounded-xl bg-gradient-to-br from-primary-soft to-surface-2">
                  {p.imageUrl ? (
                    // eslint-disable-next-line jsx-a11y/alt-text
                    <img
                      src={p.imageUrl}
                      alt={p.productName}
                      className="max-h-full max-w-full object-contain p-3"
                    />
                  ) : (
                    <div className="text-6xl">💊</div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold leading-snug">
                  {p.productName}
                </h3>
                <button
                  onClick={() => f.openDetail(p.id)}
                  className="mt-1 text-xs font-medium text-primary hover:underline"
                >
                  View details →
                </button>
              </div>
            </div>
          ))}

          {rows.map((row, ri) => (
            <div key={row.label} className="contents">
              <div
                className={`sticky left-0 z-10 flex items-center bg-background px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${ri > 0 ? "border-t border-border" : ""}`}
              >
                {row.label}
              </div>
              {items.map((p) => (
                <div
                  key={p.id + row.label}
                  className={`flex items-center px-4 py-3 text-sm ${ri > 0 ? "border-t border-border" : ""}`}
                >
                  {row.render(p)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
