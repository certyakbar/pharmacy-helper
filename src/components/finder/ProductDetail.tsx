import { useFinder } from "@/lib/finder-context";
import { PRODUCTS, SYMPTOMS } from "@/lib/finder-data";
import { AlertCircle, Check, HelpCircle, Info, Scale, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { BackBar } from "./AppShell";
import { DynIcon, ShelfLocation, StockBadge, SymptomChip, categoryMeta } from "./bits";

export function ProductDetail() {
  const f = useFinder();
  const p = PRODUCTS.find((x) => x.id === f.detailId);
  if (!p) {
    return (
      <div className="surface-card p-12 text-center">
        <p className="text-muted-foreground">Product not found.</p>
        <button onClick={() => f.go("products")} className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          Back to products
        </button>
      </div>
    );
  }
  const cat = categoryMeta(p.category);
  const matched = p.symptoms.filter((s) => f.symptoms.includes(s));
  const inCompare = f.compareIds.includes(p.id);

  return (
    <div>
      <BackBar to="products" label="Back to products" />

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="surface-card relative flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-primary-soft via-surface to-accent-soft">
          <div className="text-[14rem] drop-shadow-sm">{p.image}</div>
          <span className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-surface/95 px-3 py-1.5 text-xs font-semibold backdrop-blur">
            <DynIcon name={cat.icon} className="h-4 w-4 text-primary" />
            {cat.name}
          </span>
          <span className="absolute bottom-5 left-5 inline-flex items-center gap-1.5 rounded-full bg-foreground/90 px-3 py-1.5 text-xs font-medium text-background">
            <ShieldCheck className="h-3.5 w-3.5" /> Demo retailer catalogue
          </span>
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap gap-1.5">
              {p.badges.map((b) => (
                <span key={b} className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-foreground">{b}</span>
              ))}
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">{p.productName}</h1>
            <p className="mt-1.5 text-muted-foreground">{p.activeIngredient}</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="font-display text-4xl font-bold">£{p.price.toFixed(2)}</div>
            <StockBadge status={p.stockStatus} qty={p.stockQuantity} />
            <ShelfLocation aisle={p.aisle} bay={p.bay} shelf={p.shelf} className="text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Formulation" value={p.formulation} />
            <Field label="Pack size" value={p.packSize} />
            <Field label="SKU" value={p.sku} />
            <Field label="GTIN" value={p.gtin} />
          </div>

          {matched.length > 0 && (
            <div className="rounded-2xl border border-primary/30 bg-primary-soft p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Sparkles className="h-4 w-4" /> Why this appears
              </div>
              <p className="mt-1.5 text-sm text-foreground/90">
                Matched to {matched.length} of your selected symptom{matched.length > 1 ? "s" : ""}:
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {matched.map((s) => <SymptomChip key={s} id={s} />)}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-surface-2 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Info className="h-4 w-4 text-primary" /> Good to know
            </div>
            <ul className="mt-2 space-y-1.5 text-sm text-foreground/90">
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> Category: {cat.name}</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                Drowsiness: {p.drowsiness === "none" ? "Non-drowsy" : p.drowsiness === "low" ? "Low risk of drowsiness" : "May cause drowsiness"}
              </li>
              {p.requiresStaffHelp && (
                <li className="flex gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" /> Ask the pharmacy team before first use</li>
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning-foreground/90">
            <strong className="block font-semibold">Read the label before use.</strong>
            {p.disclaimer}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => f.toggleCompare(p.id)}
              disabled={!inCompare && f.compareIds.length >= 3}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition-colors",
                inCompare ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface hover:border-primary/40 disabled:opacity-40",
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}
