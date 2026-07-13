import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CategoryId, Product, SymptomId } from "./finder-data";
import { PRODUCTS, scoreProduct } from "./finder-data";

export type Step = "welcome" | "symptoms" | "categories" | "products" | "detail" | "compare" | "help";

export interface Filters {
  category: CategoryId | "all";
  symptoms: SymptomId[];
  formulation: string | "all";
  priceMax: number;
  inStockOnly: boolean;
}

export type SortKey = "best" | "price-asc" | "price-desc" | "pack";

interface State {
  step: Step;
  previousStep: Step;
  symptoms: SymptomId[];
  focusCategory: CategoryId | "all";
  compareIds: string[];
  detailId: string | null;
  filters: Filters;
  sort: SortKey;
  bannerDismissed: boolean;
}

interface Ctx extends State {
  go: (s: Step) => void;
  toggleSymptom: (s: SymptomId) => void;
  clearSymptoms: () => void;
  setFocusCategory: (c: CategoryId | "all") => void;
  openDetail: (id: string) => void;
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
  setFilters: (f: Partial<Filters>) => void;
  setSort: (s: SortKey) => void;
  resetAll: () => void;
  dismissBanner: () => void;
  filteredSortedProducts: Product[];
}

const defaultFilters: Filters = {
  category: "all",
  symptoms: [],
  formulation: "all",
  priceMax: 15,
  inStockOnly: false,
};

const initial: State = {
  step: "welcome",
  previousStep: "welcome",
  symptoms: [],
  focusCategory: "all",
  compareIds: [],
  detailId: null,
  filters: defaultFilters,
  sort: "best",
  bannerDismissed: false,
};

const FinderCtx = createContext<Ctx | null>(null);
const STORAGE_KEY = "pharmacy-finder-v1";

export function FinderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...initial, ...JSON.parse(raw) });
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state, hydrated]);

  const go = useCallback((s: Step) => setState((p) => ({ ...p, previousStep: p.step, step: s })), []);

  const toggleSymptom = useCallback((s: SymptomId) =>
    setState((p) => ({ ...p, symptoms: p.symptoms.includes(s) ? p.symptoms.filter((x) => x !== s) : [...p.symptoms, s] })), []);

  const clearSymptoms = useCallback(() => setState((p) => ({ ...p, symptoms: [] })), []);

  const setFocusCategory = useCallback((c: CategoryId | "all") =>
    setState((p) => ({ ...p, focusCategory: c, filters: { ...p.filters, category: c } })), []);

  const openDetail = useCallback((id: string) =>
    setState((p) => ({ ...p, previousStep: p.step, step: "detail", detailId: id })), []);

  const toggleCompare = useCallback((id: string) =>
    setState((p) => {
      if (p.compareIds.includes(id)) return { ...p, compareIds: p.compareIds.filter((x) => x !== id) };
      if (p.compareIds.length >= 3) return p;
      return { ...p, compareIds: [...p.compareIds, id] };
    }), []);

  const clearCompare = useCallback(() => setState((p) => ({ ...p, compareIds: [] })), []);
  const setFilters = useCallback((f: Partial<Filters>) => setState((p) => ({ ...p, filters: { ...p.filters, ...f } })), []);
  const setSort = useCallback((s: SortKey) => setState((p) => ({ ...p, sort: s })), []);
  const resetAll = useCallback(() => {
    setState({ ...initial, bannerDismissed: true });
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);
  const dismissBanner = useCallback(() => setState((p) => ({ ...p, bannerDismissed: true })), []);

  const filteredSortedProducts = useMemo(() => {
    let list = PRODUCTS.filter((p) => {
      if (state.filters.category !== "all" && p.category !== state.filters.category) return false;
      if (state.filters.formulation !== "all" && !p.formulation.toLowerCase().includes(state.filters.formulation.toLowerCase())) return false;
      if (state.filters.inStockOnly && p.stockStatus !== "in-stock") return false;
      if (p.price > state.filters.priceMax) return false;
      if (state.filters.symptoms.length > 0 && !state.filters.symptoms.some((s) => p.symptoms.includes(s))) return false;
      return true;
    });
    const packNum = (s: string) => parseInt(s.replace(/[^0-9]/g, ""), 10) || 0;
    list = [...list].sort((a, b) => {
      switch (state.sort) {
        case "price-asc": return a.price - b.price;
        case "price-desc": return b.price - a.price;
        case "pack": return packNum(b.packSize) - packNum(a.packSize);
        default:
          return scoreProduct(b, state.symptoms) - scoreProduct(a, state.symptoms) || a.price - b.price;
      }
    });
    return list;
  }, [state.filters, state.sort, state.symptoms]);

  const value: Ctx = {
    ...state,
    go, toggleSymptom, clearSymptoms, setFocusCategory, openDetail,
    toggleCompare, clearCompare, setFilters, setSort, resetAll, dismissBanner,
    filteredSortedProducts,
  };

  return <FinderCtx.Provider value={value}>{children}</FinderCtx.Provider>;
}

export function useFinder() {
  const ctx = useContext(FinderCtx);
  if (!ctx) throw new Error("useFinder outside provider");
  return ctx;
}
