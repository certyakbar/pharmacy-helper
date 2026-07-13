// Stage 2B customer-journey state. Wires the visible finder screens to the
// database-backed finder services. No runtime import of finder-data.ts.
//
// Contract
// - Bootstrap (symptoms, display groups, catalogue version, store, formulations)
//   is loaded once via TanStack Query and re-used across screens.
// - The customer selection uses UUIDs from the published catalogue:
//     * symptomIds        – symptom UUIDs
//     * displayGroupId    – display-group UUID (or null = "all")
//     * detailId          – catalogue_version_item_id
//     * compareIds        – catalogue_version_item_id[]
// - When the active catalogue version changes we clear product-scoped
//   selections (detail + compare snapshots), prune symptoms that vanished,
//   and drop the user on the categories screen with a refresh banner.
// - Session storage schema is versioned; older prototype IDs cannot leak in.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useBootstrap } from "./finder/hooks";
import type {
  BootstrapOk,
  BootstrapResponse,
  CatalogueItem,
  DisplayGroup,
  Symptom,
  SortOption,
} from "./finder/schemas";

export type Step =
  | "welcome"
  | "symptoms"
  | "categories"
  | "products"
  | "detail"
  | "compare"
  | "help";

export type SortKey = SortOption;

export interface Filters {
  formulation: string | "all";
  priceMax: number | null;
  inStockOnly: boolean;
}

/** Minimal product snapshot cached client-side so Compare / Pharmacy Help can
 *  render even after leaving the search results. Populated from the search
 *  and product-detail responses (never fabricated). */
export interface CompareSnapshot {
  id: string; // catalogue_version_item_id
  productName: string;
  brandName: string | null;
  activeIngredient: string;
  formulation: string;
  packSize: string;
  price: number;
  promotionalPrice: number | null;
  effectivePrice: number;
  imageUrl: string | null;
  aisle: string | null;
  bay: string | null;
  shelf: string | null;
  requiresStaffHelp: boolean;
  drowsinessLevel: "none" | "low" | "moderate" | "high";
  stockStatus: "in_stock" | "low_stock" | "out_of_stock" | "ask_staff";
  catalogueVersionId: string;
}

export interface State {
  step: Step;
  previousStep: Step;
  symptomIds: string[];
  displayGroupId: string | null;
  detailId: string | null;
  compareIds: string[];
  compareSnapshots: Record<string, CompareSnapshot>;
  filters: Filters;
  sort: SortKey;
  bannerDismissed: boolean;
  catalogueVersionId: string | null;
  refreshNotice: boolean;
}

export const initialFinderState: State = {
  step: "welcome",
  previousStep: "welcome",
  symptomIds: [],
  displayGroupId: null,
  detailId: null,
  compareIds: [],
  compareSnapshots: {},
  filters: { formulation: "all", priceMax: null, inStockOnly: false },
  sort: "best_match",
  bannerDismissed: false,
  catalogueVersionId: null,
  refreshNotice: false,
};

interface Ctx extends State {
  bootstrap: BootstrapResponse | undefined;
  bootstrapLoading: boolean;
  bootstrapError: Error | null;
  symptomsById: Map<string, Symptom>;
  displayGroupsById: Map<string, DisplayGroup>;
  formulations: string[];
  storeName: string | null;
  catalogueLabel: string | null;
  catalogueFrozenAt: string | null;

  go: (s: Step) => void;
  toggleSymptom: (id: string) => void;
  clearSymptoms: () => void;
  setDisplayGroup: (id: string | null) => void;
  openDetail: (id: string) => void;
  closeDetail: () => void;
  toggleCompare: (snap: CompareSnapshot) => void;
  clearCompare: () => void;
  setFilters: (f: Partial<Filters>) => void;
  setSort: (s: SortKey) => void;
  resetAll: () => void;
  dismissBanner: () => void;
  dismissRefreshNotice: () => void;
  captureSnapshot: (snap: CompareSnapshot) => void;
}

const defaultFilters: Filters = {
  formulation: "all",
  priceMax: null,
  inStockOnly: false,
};

const initial: State = {
  step: "welcome",
  previousStep: "welcome",
  symptomIds: [],
  displayGroupId: null,
  detailId: null,
  compareIds: [],
  compareSnapshots: {},
  filters: defaultFilters,
  sort: "best_match",
  bannerDismissed: false,
  catalogueVersionId: null,
  refreshNotice: false,
};

const FinderCtx = createContext<Ctx | null>(null);

// Bump when the persisted state shape changes so stale entries are discarded.
const STORAGE_KEY = "pharmacy-finder-v2";

function isBootstrapOk(b: BootstrapResponse | undefined): b is BootstrapOk {
  return !!b && b.status === "ok";
}

/** Apply catalogue-version invalidation: drop everything that references the
 *  old immutable snapshot, prune symptoms that no longer exist, and land the
 *  user on the categories screen with a refresh banner. */
export function reconcileWithCatalogue(prev: State, ok: BootstrapOk): State {
  const versionChanged =
    prev.catalogueVersionId !== null &&
    prev.catalogueVersionId !== ok.catalogue_version.id;
  const validSymptomIds = new Set(ok.symptoms.map((s) => s.id));
  const prunedSymptoms = prev.symptomIds.filter((id) => validSymptomIds.has(id));
  const symptomsLost = prunedSymptoms.length !== prev.symptomIds.length;

  if (!versionChanged) {
    // First-time attach or same version: just record the id and prune orphaned symptoms.
    if (
      prev.catalogueVersionId === ok.catalogue_version.id &&
      !symptomsLost
    ) {
      return prev;
    }
    return {
      ...prev,
      catalogueVersionId: ok.catalogue_version.id,
      symptomIds: prunedSymptoms,
    };
  }

  return {
    ...prev,
    catalogueVersionId: ok.catalogue_version.id,
    symptomIds: prunedSymptoms,
    displayGroupId: null,
    detailId: null,
    compareIds: [],
    compareSnapshots: {},
    step: prev.step === "welcome" || prev.step === "symptoms"
      ? prev.step
      : "categories",
    previousStep: prev.step,
    refreshNotice: true,
  };
}

export function FinderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initial);
  const [hydrated, setHydrated] = useState(false);
  const bootstrapQ = useBootstrap();

  // Hydrate from sessionStorage (v2 only; older schema versions are ignored
  // by their key so stale catalogue-scoped IDs cannot leak in).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<State>;
        setState((p) => ({ ...p, ...parsed, refreshNotice: false }));
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  // Reconcile with the catalogue whenever bootstrap resolves / refreshes.
  const lastReconciledVersion = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    if (!isBootstrapOk(bootstrapQ.data)) return;
    const versionId = bootstrapQ.data.catalogue_version.id;
    if (lastReconciledVersion.current === versionId) return;
    lastReconciledVersion.current = versionId;
    setState((p) => reconcileWithCatalogue(p, bootstrapQ.data as BootstrapOk));
  }, [hydrated, bootstrapQ.data]);

  const go = useCallback(
    (s: Step) => setState((p) => ({ ...p, previousStep: p.step, step: s })),
    [],
  );

  const toggleSymptom = useCallback(
    (id: string) =>
      setState((p) => ({
        ...p,
        symptomIds: p.symptomIds.includes(id)
          ? p.symptomIds.filter((x) => x !== id)
          : [...p.symptomIds, id],
      })),
    [],
  );

  const clearSymptoms = useCallback(
    () => setState((p) => ({ ...p, symptomIds: [] })),
    [],
  );

  const setDisplayGroup = useCallback(
    (id: string | null) => setState((p) => ({ ...p, displayGroupId: id })),
    [],
  );

  const openDetail = useCallback(
    (id: string) =>
      setState((p) => ({
        ...p,
        previousStep: p.step,
        step: "detail",
        detailId: id,
      })),
    [],
  );

  const closeDetail = useCallback(
    () => setState((p) => ({ ...p, detailId: null })),
    [],
  );

  const captureSnapshot = useCallback((snap: CompareSnapshot) => {
    setState((p) => {
      const existing = p.compareSnapshots[snap.id];
      if (existing && existing.catalogueVersionId === snap.catalogueVersionId) return p;
      return { ...p, compareSnapshots: { ...p.compareSnapshots, [snap.id]: snap } };
    });
  }, []);

  const toggleCompare = useCallback((snap: CompareSnapshot) => {
    setState((p) => {
      if (p.compareIds.includes(snap.id)) {
        const nextSnap = { ...p.compareSnapshots };
        delete nextSnap[snap.id];
        return {
          ...p,
          compareIds: p.compareIds.filter((x) => x !== snap.id),
          compareSnapshots: nextSnap,
        };
      }
      if (p.compareIds.length >= 3) return p;
      return {
        ...p,
        compareIds: [...p.compareIds, snap.id],
        compareSnapshots: { ...p.compareSnapshots, [snap.id]: snap },
      };
    });
  }, []);

  const clearCompare = useCallback(
    () => setState((p) => ({ ...p, compareIds: [], compareSnapshots: {} })),
    [],
  );

  const setFilters = useCallback(
    (f: Partial<Filters>) =>
      setState((p) => ({ ...p, filters: { ...p.filters, ...f } })),
    [],
  );

  const setSort = useCallback(
    (s: SortKey) => setState((p) => ({ ...p, sort: s })),
    [],
  );

  const resetAll = useCallback(() => {
    setState({ ...initial, bannerDismissed: true });
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const dismissBanner = useCallback(
    () => setState((p) => ({ ...p, bannerDismissed: true })),
    [],
  );

  const dismissRefreshNotice = useCallback(
    () => setState((p) => ({ ...p, refreshNotice: false })),
    [],
  );

  const { symptomsById, displayGroupsById, formulations, storeName, catalogueLabel, catalogueFrozenAt } = useMemo(() => {
    if (!isBootstrapOk(bootstrapQ.data)) {
      return {
        symptomsById: new Map<string, Symptom>(),
        displayGroupsById: new Map<string, DisplayGroup>(),
        formulations: [] as string[],
        storeName: null as string | null,
        catalogueLabel: null as string | null,
        catalogueFrozenAt: null as string | null,
      };
    }
    const ok = bootstrapQ.data;
    return {
      symptomsById: new Map(ok.symptoms.map((s) => [s.id, s])),
      displayGroupsById: new Map(ok.display_groups.map((g) => [g.id, g])),
      formulations: ok.formulations,
      storeName: ok.store.name,
      catalogueLabel: ok.catalogue_version.label,
      catalogueFrozenAt: ok.catalogue_version.frozen_at,
    };
  }, [bootstrapQ.data]);

  const value: Ctx = {
    ...state,
    bootstrap: bootstrapQ.data,
    bootstrapLoading: bootstrapQ.isLoading,
    bootstrapError: bootstrapQ.error ?? null,
    symptomsById,
    displayGroupsById,
    formulations,
    storeName,
    catalogueLabel,
    catalogueFrozenAt,
    go,
    toggleSymptom,
    clearSymptoms,
    setDisplayGroup,
    openDetail,
    closeDetail,
    toggleCompare,
    clearCompare,
    setFilters,
    setSort,
    resetAll,
    dismissBanner,
    dismissRefreshNotice,
    captureSnapshot,
  };

  return <FinderCtx.Provider value={value}>{children}</FinderCtx.Provider>;
}

export function useFinder() {
  const ctx = useContext(FinderCtx);
  if (!ctx) throw new Error("useFinder outside provider");
  return ctx;
}

/** Convert a search-response product into the client-side compare snapshot. */
export function toCompareSnapshot(
  item: CatalogueItem,
  effectivePrice: number,
  catalogueVersionId: string,
): CompareSnapshot {
  return {
    id: item.id,
    productName: item.product_name,
    brandName: item.brand_name,
    activeIngredient: item.active_ingredient,
    formulation: item.formulation,
    packSize: item.pack_size,
    price: item.price,
    promotionalPrice: item.promotional_price,
    effectivePrice,
    imageUrl: item.image_url,
    aisle: item.aisle,
    bay: item.bay,
    shelf: item.shelf,
    requiresStaffHelp: item.requires_staff_help,
    drowsinessLevel: item.drowsiness_level,
    stockStatus: item.stock_status,
    catalogueVersionId,
  };
}

export const FINDER_STORAGE_KEY = STORAGE_KEY;
