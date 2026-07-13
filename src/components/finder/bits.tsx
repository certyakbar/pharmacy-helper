import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Package } from "lucide-react";

import type { StockStatus } from "@/lib/finder/schemas";
import { useFinder } from "@/lib/finder-context";
import { cn } from "@/lib/utils";

/** Dynamic lucide icon by name (bootstrap uses arbitrary icon names). */
export function DynIcon({ name, className }: { name: string | null; className?: string }) {
  const registry = LucideIcons as unknown as Record<string, LucideIcon>;
  const I = (name && registry[name]) || Package;
  return <I className={className} strokeWidth={1.75} />;
}

/** Format a formulation enum value as a customer label. */
export function formulationLabel(v: string): string {
  return v
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export function SymptomChip({
  symptomId,
  active,
  onClick,
}: {
  symptomId: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const { symptomsById } = useFinder();
  const s = symptomsById.get(symptomId);
  if (!s) return null;
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-surface-2 text-foreground border-border hover:border-primary/40",
      )}
    >
      <DynIcon name={s.icon} className="h-3.5 w-3.5" />
      {s.name}
    </Comp>
  );
}

export function StockBadge({ status, qty }: { status: StockStatus; qty?: number }) {
  const map: Record<StockStatus, { label: string; cls: string }> = {
    in_stock: { label: "In stock", cls: "bg-success/10 text-success border-success/30" },
    low_stock: {
      label: `Low stock${qty ? ` · ${qty} left` : ""}`,
      cls: "bg-warning/15 text-warning-foreground border-warning/40",
    },
    out_of_stock: {
      label: "Out of stock",
      cls: "bg-muted text-muted-foreground border-border",
    },
    ask_staff: {
      label: "Ask staff",
      cls: "bg-accent/15 text-accent-foreground border-accent/30",
    },
  };
  const m = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        m.cls,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {m.label}
    </span>
  );
}

export function ShelfLocation({
  aisle,
  bay,
  shelf,
  className,
}: {
  aisle: string | null;
  bay: string | null;
  shelf: string | null;
  className?: string;
}) {
  if (!aisle && !bay && !shelf) return null;
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}
    >
      <Package className="h-3.5 w-3.5" />
      {aisle && `Aisle ${aisle}`}
      {bay && ` · Bay ${bay}`}
      {shelf && ` · Shelf ${shelf}`}
    </span>
  );
}
