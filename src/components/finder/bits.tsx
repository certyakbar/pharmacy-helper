import type { LucideIcon } from "lucide-react";
import {
  Wind, Droplet, Ban, Sparkles, Eye, CloudDrizzle,
  Pill, SprayCan, Package,
} from "lucide-react";
import type { StockStatus, SymptomId, CategoryId } from "@/lib/finder-data";
import { SYMPTOMS, CATEGORIES } from "@/lib/finder-data";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  Wind, Droplet, Ban, Sparkles, Eye, CloudDrizzle, Pill, SprayCan, Package,
};

export function DynIcon({ name, className }: { name: string; className?: string }) {
  const I = ICONS[name] ?? Package;
  return <I className={className} strokeWidth={1.75} />;
}

export function SymptomChip({ id, active, onClick }: { id: SymptomId; active?: boolean; onClick?: () => void }) {
  const s = SYMPTOMS.find((x) => x.id === id);
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
      {s.label}
    </Comp>
  );
}

export function StockBadge({ status, qty }: { status: StockStatus; qty?: number }) {
  const map = {
    "in-stock": { label: "In stock", cls: "bg-success/10 text-success border-success/30" },
    "low-stock": { label: `Low stock${qty ? ` · ${qty} left` : ""}`, cls: "bg-warning/15 text-warning-foreground border-warning/40" },
    "ask-staff": { label: "Ask staff", cls: "bg-accent/15 text-accent-foreground border-accent/30" },
  } as const;
  const m = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", m.cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {m.label}
    </span>
  );
}

export function ShelfLocation({ aisle, bay, shelf, className }: { aisle: number; bay: number; shelf: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}>
      <Package className="h-3.5 w-3.5" />
      Aisle {aisle} · Bay {bay} · Shelf {shelf}
    </span>
  );
}

export function categoryMeta(id: CategoryId) {
  return CATEGORIES.find((c) => c.id === id)!;
}
