import { createFileRoute } from "@tanstack/react-router";
import { HelpCircle, Loader2, RotateCcw } from "lucide-react";

import { AppShell } from "@/components/finder/AppShell";
import { Categories } from "@/components/finder/Categories";
import { Compare } from "@/components/finder/Compare";
import { PharmacyHelp } from "@/components/finder/PharmacyHelp";
import { ProductDetail } from "@/components/finder/ProductDetail";
import { Products } from "@/components/finder/Products";
import { Symptoms } from "@/components/finder/Symptoms";
import { Welcome } from "@/components/finder/Welcome";
import { FinderProvider, useFinder } from "@/lib/finder-context";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <FinderProvider>
      <AppShell>
        <CatalogueGuard>
          <Screen />
        </CatalogueGuard>
      </AppShell>
    </FinderProvider>
  );
}

function Screen() {
  const { step } = useFinder();
  switch (step) {
    case "welcome":
      return <Welcome />;
    case "symptoms":
      return <Symptoms />;
    case "categories":
      return <Categories />;
    case "products":
      return <Products />;
    case "detail":
      return <ProductDetail />;
    case "compare":
      return <Compare />;
    case "help":
      return <PharmacyHelp />;
  }
}

/** Global load / error / catalogue-unavailable / store-misconfigured gate.
 *  Anything downstream can assume `bootstrap.status === 'ok'`. */
function CatalogueGuard({ children }: { children: React.ReactNode }) {
  const f = useFinder();
  const { bootstrap, bootstrapLoading, bootstrapError, step } = f;

  // Welcome + Pharmacy Help can render before bootstrap resolves, so the
  // kiosk isn't a spinner from cold start.
  if (bootstrapLoading && !bootstrap) {
    if (step === "welcome" || step === "help") return <>{children}</>;
    return (
      <div className="surface-card mx-auto flex max-w-lg items-center justify-center gap-3 p-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        <span>Loading product catalogue…</span>
      </div>
    );
  }

  if (bootstrapError) {
    return (
      <ErrorBlock
        title="We couldn’t reach the catalogue service"
        message="Please ask the pharmacy team for help."
        onStartOver={f.resetAll}
        onHelp={() => f.go("help")}
      />
    );
  }

  if (bootstrap && bootstrap.status === "unavailable") {
    const storeIssue = bootstrap.reason === "store_not_found";
    return (
      <ErrorBlock
        title={
          storeIssue
            ? "This kiosk isn’t configured yet"
            : "Product information is temporarily unavailable. Please ask the pharmacy team for help."
        }
        message={
          storeIssue
            ? "Please ask the pharmacy team for help."
            : "The published catalogue is being refreshed. A member of the pharmacy team can help you in the meantime."
        }
        onStartOver={f.resetAll}
        onHelp={() => f.go("help")}
      />
    );
  }

  return (
    <>
      {f.refreshNotice && <RefreshBanner onDismiss={f.dismissRefreshNotice} />}
      {children}
    </>
  );
}

function ErrorBlock({
  title,
  message,
  onStartOver,
  onHelp,
}: {
  title: string;
  message: string;
  onStartOver: () => void;
  onHelp: () => void;
}) {
  return (
    <div className="surface-card mx-auto max-w-lg p-8 text-center">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          onClick={onHelp}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <HelpCircle className="h-4 w-4" /> Ask Pharmacy Team
        </button>
        <button
          onClick={onStartOver}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold hover:border-primary/40"
        >
          <RotateCcw className="h-4 w-4" /> Start Again
        </button>
      </div>
    </div>
  );
}

function RefreshBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary-soft px-4 py-3 text-sm text-primary">
      <span>Product information was refreshed.</span>
      <button
        onClick={onDismiss}
        className="rounded-full border border-primary/40 bg-surface px-3 py-1 text-xs font-semibold hover:bg-primary/10"
      >
        Dismiss
      </button>
    </div>
  );
}
