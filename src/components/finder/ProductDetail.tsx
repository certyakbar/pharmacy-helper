import { useEffect } from "react";
import {
  AlertCircle,
  Check,
  HelpCircle,
  Info,
  Loader2,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { toCompareSnapshot, useFinder } from "@/lib/finder-context";
import { useProductDetailQuery } from "@/lib/finder/hooks";
import { cn } from "@/lib/utils";

import { BackBar } from "./AppShell";
import {
  DynIcon,
  ShelfLocation,
  StockBadge,
  formulationLabel,
} from "./bits";

export function ProductDetail() {
  const f = useFinder();
  const q = useProductDetailQuery(f.detailId, f.catalogueVersionId);

  // If the item is not found (stale ID), return the user to the product list
  // with a friendly refresh notice.
  useEffect(() => {
    if (q.data?.status === "not_found") {
      f.closeDetail();
      f.go("products");
    }
  }, [q.data, f]);

  if (!f.detailId) {
    return <FallbackBlock label="No product selected." onBack={() => f.go("products")} />;
  }

  if (q.isLoading) {
    return (
      <div>
        <BackBar to="products" label="Back to products" />
        <div className="surface-card flex items-center justify-center gap-3 p-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Loading product details…
        </div>
      </div>
    );
  }

  if (!q.data || q.data.status === "unavailable") {
    return (
      <div>
        <BackBar to="products" label="Back to products" />
        <div className="surface-card flex flex-col items-center gap-3 p-12 text-center">
          <h3 className="font-display text-xl font-semibold">
            Product information is temporarily unavailable
          </h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Please ask the pharmacy team for help.
          </p>
        </div>
      </div>
    );
  }

  if (q.data.status === "not_found") {
    return <FallbackBlock label="Refreshing product information…" onBack={() => f.go("products")} />;
  }

  const p = q.data.product;
  const inCompare = f.compareIds.includes(p.id);
  const showPromo =
    p.promotional_price !== null && p.promotional_price < p.price;
  const effectivePrice = p.promotional_price ?? p.price;
  const snap = toCompareSnapshot(p, effectivePrice, f.catalogueVersionId ?? "");

  return (
    <div>
      <BackBar to="products" label="Back to products" />

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="surface-card relative flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-primary-soft via-surface to-accent-soft">
          {p.image_url ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img
              src={p.image_url}
              alt={p.product_name}
              className="max-h-full max-w-full object-contain p-8"
            />
          ) : (
            <div className="text-[14rem] drop-shadow-sm">💊</div>
          )}
          <span className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-surface/95 px-3 py-1.5 text-xs font-semibold backdrop-blur">
            <DynIcon name="Pill" className="h-4 w-4 text-primary" />
            {formulationLabel(p.formulation)}
          </span>
          <span className="absolute bottom-5 left-5 inline-flex items-center gap-1.5 rounded-full bg-foreground/90 px-3 py-1.5 text-xs font-medium text-background">
            <ShieldCheck className="h-3.5 w-3.5" /> Live catalogue snapshot
          </span>
        </div>

        <div className="space-y-5">
          <div>
            {p.brand_name && (
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {p.brand_name}
              </div>
            )}
            <h1 className="mt-1 font-display text-3xl font-semibold md:text-4xl">
              {p.product_name}
            </h1>
            <p className="mt-1.5 text-muted-foreground">
              {p.active_ingredient}
              {p.strength ? ` · ${p.strength}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {showPromo ? (
              <div>
                <div className="font-display text-4xl font-bold">
                  £{p.promotional_price!.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground line-through">
                  £{p.price.toFixed(2)}
                </div>
              </div>
            ) : (
              <div className="font-display text-4xl font-bold">
                £{p.price.toFixed(2)}
              </div>
            )}
            <StockBadge status={p.stock_status} qty={p.stock_quantity} />
            <ShelfLocation aisle={p.aisle} bay={p.bay} shelf={p.shelf} className="text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Formulation" value={formulationLabel(p.formulation)} />
            <Field label="Pack size" value={p.pack_size} />
            <Field label="SKU" value={p.retailer_sku} />
            <Field
              label="Drowsiness"
              value={drowsinessLabel(p.drowsiness_level)}
            />
          </div>

          {p.customer_summary && (
            <div className="rounded-2xl border border-primary/30 bg-primary-soft p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Sparkles className="h-4 w-4" /> About this product
              </div>
              <p className="mt-1.5 text-sm text-foreground/90">
                {p.customer_summary}
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-surface-2 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Info className="h-4 w-4 text-primary" /> Good to know
            </div>
            <ul className="mt-2 space-y-1.5 text-sm text-foreground/90">
              <li className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{" "}
                Drowsiness: {drowsinessLabel(p.drowsiness_level)}
              </li>
              {p.requires_staff_help && (
                <li className="flex gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />{" "}
                  Please ask the pharmacy team before first use
                </li>
              )}
            </ul>
          </div>

          {p.warning_text && (
            <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning-foreground/90">
              <strong className="block font-semibold">
                Read the label before use.
              </strong>
              {p.warning_text}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => f.toggleCompare(snap)}
              disabled={!inCompare && f.compareIds.length >= 3}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition-colors",
                inCompare
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface hover:border-primary/40 disabled:opacity-40",
              )}
            >
              <Scale className="h-4 w-4" />
              {inCompare ? "Added to compare" : "Add to compare"}
            </button>
            {f.compareIds.length > 0 && (
              <button
                onClick={() => f.go("compare")}
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background"
              >
                View compare ({f.compareIds.length})
              </button>
            )}
            <button
              onClick={() => f.go("help")}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground hover:opacity-90"
            >
              <HelpCircle className="h-4 w-4" /> Ask the pharmacy team about this
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function drowsinessLabel(l: "none" | "low" | "moderate" | "high") {
  switch (l) {
    case "none":
      return "Non-drowsy";
    case "low":
      return "Low risk of drowsiness";
    case "moderate":
      return "May cause drowsiness";
    case "high":
      return "Likely to cause drowsiness";
  }
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}

function FallbackBlock({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div className="surface-card p-12 text-center">
      <p className="text-muted-foreground">{label}</p>
      <button
        onClick={onBack}
        className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
      >
        Back to products
      </button>
    </div>
  );
}
