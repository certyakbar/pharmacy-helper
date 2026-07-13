import { createFileRoute } from "@tanstack/react-router";
import { FinderProvider, useFinder } from "@/lib/finder-context";
import { AppShell } from "@/components/finder/AppShell";
import { Welcome } from "@/components/finder/Welcome";
import { Symptoms } from "@/components/finder/Symptoms";
import { Categories } from "@/components/finder/Categories";
import { Products } from "@/components/finder/Products";
import { ProductDetail } from "@/components/finder/ProductDetail";
import { Compare } from "@/components/finder/Compare";
import { PharmacyHelp } from "@/components/finder/PharmacyHelp";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <FinderProvider>
      <AppShell>
        <Screen />
      </AppShell>
    </FinderProvider>
  );
}

function Screen() {
  const { step } = useFinder();
  switch (step) {
    case "welcome": return <Welcome />;
    case "symptoms": return <Symptoms />;
    case "categories": return <Categories />;
    case "products": return <Products />;
    case "detail": return <ProductDetail />;
    case "compare": return <Compare />;
    case "help": return <PharmacyHelp />;
  }
}
