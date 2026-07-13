import { useFinder } from "@/lib/finder-context";
import type { Step } from "@/lib/finder-context";
import { HelpCircle, Info, RotateCcw, ShoppingBasket, X, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const STEPS: { key: Step; label: string; num: number }[] = [
  { key: "symptoms", label: "Symptoms", num: 1 },
  { key: "categories", label: "Categories", num: 2 },
  { key: "products", label: "Products", num: 3 },
];

function progressIndex(step: Step): number {
  if (step === "welcome") return -1;
  if (step === "symptoms") return 0;
  if (step === "categories") return 1;
  return 2; // products, detail, compare, help
}

export function AppShell({ children }: { children: ReactNode }) {
  const f = useFinder();
  const idx = progressIndex(f.step);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!f.bannerDismissed && (
        <div className="bg-accent-soft border-b border-accent/20 text-sm">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 md:px-8">
            <Info className="h-4 w-4 shrink-0 text-accent" />
            <p className="min-w-0 flex-1 text-accent-foreground/90">
              <strong className="font-semibold">Interactive prototype</strong> using demonstration catalogue data.
            </p>
            <button
              onClick={f.dismissBanner}
              aria-label="Dismiss notice"
              className="rounded-md p-1 hover:bg-accent/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-8 md:py-4">
          <button
            onClick={() => f.go("welcome")}
            className="flex min-w-0 items-center gap-2.5 text-left"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-card">
              <ShoppingBasket className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="truncate font-display text-lg font-semibold leading-tight">Pharmacy Product Finder</div>
              <div className="hidden text-xs text-muted-foreground sm:block">In-store guided journey</div>
            </div>
          </button>

          {idx >= 0 && (
            <nav aria-label="Progress" className="mx-auto hidden md:flex items-center gap-1">
              {STEPS.map((s, i) => {
                const active = i === idx;
                const done = i < idx;
                return (
                  <div key={s.key} className="flex items-center">
                    <button
                      onClick={() => (done ? f.go(s.key) : undefined)}
                      disabled={!done}
                      className={cn(
                        "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors",
                        active && "bg-primary-soft text-primary font-semibold",
                        done && "text-foreground hover:bg-muted cursor-pointer",
                        !active && !done && "text-muted-foreground",
                      )}
                    >
                      <span className={cn(
                        "grid h-6 w-6 place-items-center rounded-full text-xs font-semibold",
                        active ? "bg-primary text-primary-foreground" : done ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground",
                      )}>{s.num}</span>
                      {s.label}
                    </button>
                    {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border" />}
                  </div>
                );
              })}
            </nav>
          )}

          <div className={cn("ml-auto flex items-center gap-2", idx < 0 && "ml-auto")}>
            {f.compareIds.length > 0 && (
              <button
                onClick={() => f.go("compare")}
                className="hidden sm:inline-flex items-center gap-2 rounded-full border border-primary bg-primary-soft px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10"
              >
                Compare · {f.compareIds.length}
              </button>
            )}
            <button
              onClick={() => f.go("help")}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium hover:border-primary/40"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Ask pharmacy team</span>
            </button>
            {f.step !== "welcome" && (
              <button
                onClick={() => {
                  if (confirm("Start again? This clears your selections.")) f.resetAll();
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-muted-foreground hover:border-destructive/40 hover:text-destructive"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="hidden md:inline">Start again</span>
              </button>
            )}
          </div>
        </div>

        {idx >= 0 && (
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 pb-3 md:hidden">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex flex-1 items-center gap-2">
                <span className={cn(
                  "grid h-6 w-6 place-items-center rounded-full text-xs font-semibold",
                  i === idx ? "bg-primary text-primary-foreground" : i < idx ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground",
                )}>{s.num}</span>
                <span className={cn("truncate text-xs", i === idx ? "font-semibold text-foreground" : "text-muted-foreground")}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-10">{children}</main>

      <footer className="border-t border-border bg-surface-2/60 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 text-xs text-muted-foreground md:px-8">
          <span>Demonstration catalogue · Not medical advice</span>
          <span>Read the label before use · Ask a pharmacist if in doubt</span>
        </div>
      </footer>
    </div>
  );
}

export function BackBar({ to, label = "Back" }: { to: Step; label?: string }) {
  const f = useFinder();
  return (
    <button
      onClick={() => f.go(to)}
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> {label}
    </button>
  );
}
