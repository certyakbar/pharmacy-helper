// Component-level behavioural tests for the Stage 2B customer journey.
// We avoid a DOM library (not installed) and instead exercise the pure
// reducer helpers and query-key factory that back the UI.

import { describe, expect, it } from "vitest";

import {
  initialFinderState,
  reconcileWithCatalogue,
  toCompareSnapshot,
  FINDER_STORAGE_KEY,
  type CompareSnapshot,
} from "../src/lib/finder-context";
import { finderKeys } from "../src/lib/finder/hooks";
import type { BootstrapOk, CatalogueItem } from "../src/lib/finder/schemas";

const catV = (id: string) => ({
  id,
  version_number: 1,
  label: null,
  frozen_at: "2026-07-13T00:00:00Z",
  published_at: "2026-07-13T00:00:00Z",
  publication_id: "00000000-0000-0000-0000-0000000000ff",
});

const bootstrap = (versionId: string, symptomIds: string[]): BootstrapOk => ({
  status: "ok",
  generated_at: "2026-07-13T00:00:00Z",
  store: { id: "00000000-0000-0000-0000-000000000101", name: "Store" },
  symptoms: symptomIds.map((id, i) => ({
    id,
    code: `s${i}`,
    name: `Symptom ${i}`,
    customer_description: null,
    icon: null,
    display_order: i,
  })),
  display_groups: [],
  catalogue_version: catV(versionId),
  formulations: ["tablet"],
});

const S1 = "00000000-0000-0000-0000-000000000501";
const S2 = "00000000-0000-0000-0000-000000000502";
const V1 = "00000000-0000-0000-0000-000000000a01";
const V2 = "00000000-0000-0000-0000-000000000a02";
const IT = "00000000-0000-0000-0000-000000000b01";

const snap: CompareSnapshot = {
  id: IT,
  productName: "Cetirizine",
  brandName: null,
  activeIngredient: "cetirizine",
  formulation: "tablet",
  packSize: "30",
  price: 3.49,
  promotionalPrice: null,
  effectivePrice: 3.49,
  imageUrl: null,
  aisle: null,
  bay: null,
  shelf: null,
  requiresStaffHelp: false,
  drowsinessLevel: "low",
  stockStatus: "in_stock",
  catalogueVersionId: V1,
};

describe("FINDER_STORAGE_KEY", () => {
  it("is versioned so stale prototype IDs are discarded", () => {
    expect(FINDER_STORAGE_KEY).toBe("pharmacy-finder-v2");
    expect(FINDER_STORAGE_KEY).not.toBe("pharmacy-finder-v1");
  });
});

describe("reconcileWithCatalogue", () => {
  it("attaches the catalogue version on first bootstrap without clearing anything", () => {
    const prev = {
      ...initialFinderState,
      symptomIds: [S1],
      compareIds: [IT],
      compareSnapshots: { [IT]: snap },
      step: "products" as const,
    };
    const next = reconcileWithCatalogue(prev, bootstrap(V1, [S1, S2]));
    expect(next.catalogueVersionId).toBe(V1);
    expect(next.symptomIds).toEqual([S1]);
    expect(next.compareIds).toEqual([IT]);
    expect(next.step).toBe("products");
    expect(next.refreshNotice).toBe(false);
  });

  it("clears product-scoped selections and shows refresh notice when the version changes", () => {
    const prev = {
      ...initialFinderState,
      catalogueVersionId: V1,
      symptomIds: [S1, S2],
      displayGroupId: "00000000-0000-0000-0000-000000000c01",
      detailId: IT,
      compareIds: [IT],
      compareSnapshots: { [IT]: snap },
      step: "detail" as const,
    };
    const next = reconcileWithCatalogue(prev, bootstrap(V2, [S1, S2]));
    expect(next.catalogueVersionId).toBe(V2);
    expect(next.symptomIds).toEqual([S1, S2]);
    expect(next.displayGroupId).toBeNull();
    expect(next.detailId).toBeNull();
    expect(next.compareIds).toEqual([]);
    expect(next.compareSnapshots).toEqual({});
    expect(next.refreshNotice).toBe(true);
    expect(next.step).toBe("categories");
  });

  it("prunes symptoms that no longer exist in the new catalogue", () => {
    const prev = {
      ...initialFinderState,
      catalogueVersionId: V1,
      symptomIds: [S1, S2],
      step: "categories" as const,
    };
    const next = reconcileWithCatalogue(prev, bootstrap(V2, [S1]));
    expect(next.symptomIds).toEqual([S1]);
    expect(next.refreshNotice).toBe(true);
  });
});

describe("toCompareSnapshot", () => {
  it("captures catalogue_version_item_id and effective price", () => {
    const item: CatalogueItem = {
      id: IT,
      product_id: "00000000-0000-0000-0000-000000000d01",
      retailer_sku: "SKU",
      product_name: "Cetirizine",
      brand_name: null,
      active_ingredient: "cetirizine",
      strength: "10mg",
      formulation: "tablet",
      pack_size: "30",
      customer_summary: null,
      warning_text: null,
      image_url: null,
      drowsiness_level: "low",
      requires_staff_help: false,
      treatment_group_code: null,
      treatment_group_name: null,
      display_group_codes: [],
      price: 3.49,
      promotional_price: 2.99,
      currency: "GBP",
      stock_quantity: 10,
      stock_status: "in_stock",
      aisle: "4",
      bay: "2",
      shelf: "3",
      available_for_display: true,
    };
    const s = toCompareSnapshot(item, 2.99, V1);
    expect(s.id).toBe(IT);
    expect(s.effectivePrice).toBe(2.99);
    expect(s.catalogueVersionId).toBe(V1);
    expect(s.promotionalPrice).toBe(2.99);
  });
});

describe("finderKeys.search", () => {
  const base = {
    symptomIds: [S1, S2],
    inStockOnly: false,
    sort: "best_match" as const,
  };

  it("is stable when symptom order changes", () => {
    const a = finderKeys.search(V1, { ...base, symptomIds: [S1, S2] });
    const b = finderKeys.search(V1, { ...base, symptomIds: [S2, S1] });
    expect(a).toEqual(b);
  });

  it("changes when any request field changes", () => {
    const a = finderKeys.search(V1, base);
    const b = finderKeys.search(V1, { ...base, maxPrice: 5 });
    const c = finderKeys.search(V1, { ...base, inStockOnly: true });
    const d = finderKeys.search(V1, { ...base, sort: "price_low_to_high" });
    const e = finderKeys.search(V2, base);
    expect(a).not.toEqual(b);
    expect(a).not.toEqual(c);
    expect(a).not.toEqual(d);
    expect(a).not.toEqual(e);
  });
});
