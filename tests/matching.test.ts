// Deterministic unit tests for the matching engine. No database access.
import { describe, expect, it } from "vitest";

import { runMatcher, UnknownSymptomError, effectivePrice } from "../src/lib/finder/matching";
import type {
  CatalogueItem,
  CatalogueVersionMeta,
  DisplayGroup,
  SearchRequest,
  Symptom,
  SymptomDisplayGroupEdge,
} from "../src/lib/finder/schemas";

const S = {
  sneeze: "00000000-0000-0000-0000-000000000501",
  watery: "00000000-0000-0000-0000-000000000502",
  itchyEyes: "00000000-0000-0000-0000-000000000503",
  blocked: "00000000-0000-0000-0000-000000000504",
} as const;
const G = {
  tablets: "00000000-0000-0000-0000-000000000601",
  eyeDrops: "00000000-0000-0000-0000-000000000602",
  nasal: "00000000-0000-0000-0000-000000000603",
} as const;
const P = {
  cetirizine: "00000000-0000-0000-0000-000000000701",
  eyeDrop: "00000000-0000-0000-0000-000000000702",
  saline: "00000000-0000-0000-0000-000000000703",
  unrelated: "00000000-0000-0000-0000-000000000704", // sunscreen — no group
  eyeDropExpensive: "00000000-0000-0000-0000-000000000705",
} as const;

const symptoms: Symptom[] = [
  { id: S.sneeze, code: "sneeze", name: "Sneezing", customer_description: null, icon: null, display_order: 1 },
  { id: S.watery, code: "watery-eyes", name: "Watery eyes", customer_description: null, icon: null, display_order: 2 },
  { id: S.itchyEyes, code: "itchy-eyes", name: "Itchy eyes", customer_description: null, icon: null, display_order: 3 },
  { id: S.blocked, code: "blocked-nose", name: "Blocked nose", customer_description: null, icon: null, display_order: 4 },
];
const groups: DisplayGroup[] = [
  { id: G.tablets, code: "tablets", name: "Tablets", customer_description: null, icon: null, display_order: 1 },
  { id: G.eyeDrops, code: "eye-drops", name: "Eye drops", customer_description: null, icon: null, display_order: 2 },
  { id: G.nasal, code: "nasal-sprays", name: "Nasal sprays", customer_description: null, icon: null, display_order: 3 },
];
const sdgm: SymptomDisplayGroupEdge[] = [
  { symptom_id: S.sneeze, display_group_id: G.tablets, relevance_weight: 4 },
  { symptom_id: S.sneeze, display_group_id: G.nasal, relevance_weight: 2 },
  { symptom_id: S.watery, display_group_id: G.eyeDrops, relevance_weight: 5 },
  { symptom_id: S.itchyEyes, display_group_id: G.eyeDrops, relevance_weight: 5 },
  { symptom_id: S.itchyEyes, display_group_id: G.tablets, relevance_weight: 2 },
  { symptom_id: S.blocked, display_group_id: G.nasal, relevance_weight: 5 },
];

function item(overrides: Partial<CatalogueItem>): CatalogueItem {
  return {
    id: crypto.randomUUID(),
    product_id: crypto.randomUUID(),
    retailer_sku: "SKU",
    product_name: "Product",
    brand_name: null,
    active_ingredient: "x",
    strength: null,
    formulation: "tablet",
    pack_size: "30",
    customer_summary: null,
    warning_text: null,
    image_url: null,
    drowsiness_level: "none",
    requires_staff_help: false,
    treatment_group_code: null,
    treatment_group_name: null,
    display_group_codes: [],
    price: 5,
    promotional_price: null,
    currency: "GBP",
    stock_quantity: 10,
    stock_status: "in_stock",
    aisle: null,
    bay: null,
    shelf: null,
    available_for_display: true,
    ...overrides,
  };
}

const items: CatalogueItem[] = [
  item({ id: "10000000-0000-0000-0000-000000000001", product_id: P.cetirizine, product_name: "Cetirizine", formulation: "tablet", price: 3.49, display_group_codes: ["tablets"] }),
  item({ id: "10000000-0000-0000-0000-000000000002", product_id: P.eyeDrop, product_name: "Allergy Eye Drops", formulation: "eye_drops", price: 4.49, display_group_codes: ["eye-drops"] }),
  item({ id: "10000000-0000-0000-0000-000000000003", product_id: P.saline, product_name: "Saline Nasal Spray", formulation: "nasal_spray", price: 3.99, display_group_codes: ["nasal-sprays"] }),
  item({ id: "10000000-0000-0000-0000-000000000004", product_id: P.unrelated, product_name: "Sunscreen", formulation: "cream", price: 9.99, display_group_codes: [] }),
  item({ id: "10000000-0000-0000-0000-000000000005", product_id: P.eyeDropExpensive, product_name: "Premium Eye Drops", formulation: "eye_drops", price: 9.5, stock_status: "out_of_stock", display_group_codes: ["eye-drops"] }),
];
const catalogueVersion: CatalogueVersionMeta = {
  id: "20000000-0000-0000-0000-000000000001",
  version_number: 1,
  label: "test",
  frozen_at: "2026-01-01T00:00:00Z",
  published_at: "2026-01-02T00:00:00Z",
  publication_id: "30000000-0000-0000-0000-000000000001",
};

function req(overrides: Partial<SearchRequest> = {}): SearchRequest {
  return { symptomIds: [S.itchyEyes], sort: "best_match", inStockOnly: false, ...overrides };
}
const base = {
  symptoms,
  displayGroups: groups,
  items,
  productDisplayGroupEdges: pdgm,
  symptomDisplayGroupEdges: sdgm,
  catalogueVersion,
  generatedAt: "2026-01-03T00:00:00Z",
};

describe("matching engine", () => {
  it("resolves symptom→display-group mappings and excludes zero-relevance groups", () => {
    const r = runMatcher({ ...base, request: req({ symptomIds: [S.itchyEyes] }) });
    const groupIds = r.relevant_display_groups.map((g) => g.id).sort();
    // eye-drops (weight 5) and tablets (weight 2); nasal excluded (no mapping to itchy-eyes).
    expect(groupIds).toEqual([G.eyeDrops, G.tablets].sort());
  });

  it("excludes products with no approved relationship to selected symptoms", () => {
    const r = runMatcher({ ...base, request: req({ symptomIds: [S.itchyEyes] }) });
    const names = r.products.map((p) => p.product.product_name);
    expect(names).not.toContain("Sunscreen"); // no group
    expect(names).not.toContain("Saline Nasal Spray"); // group not relevant to itchy-eyes
  });

  it("scores deterministically using symptom→group weights", () => {
    const r = runMatcher({ ...base, request: req({ symptomIds: [S.itchyEyes] }) });
    const eye = r.products.find((p) => p.product.product_name === "Allergy Eye Drops")!;
    const tab = r.products.find((p) => p.product.product_name === "Cetirizine")!;
    expect(eye.match_score).toBe(5);
    expect(tab.match_score).toBe(2);
    // best_match orders higher score first.
    expect(r.products[0]!.catalogue_version_item_id).toBe(eye.catalogue_version_item_id);
  });

  it("sorts equal-score matches stably by name then id", () => {
    const twin = item({
      id: "10000000-0000-0000-0000-00000000000A",
      product_id: "99999999-0000-0000-0000-000000000002",
      product_name: "Allergy Eye Drops", // same name
      formulation: "eye_drops",
      price: 4.49,
    });
    const items2 = [...items, twin];
    const pdgm2 = [...pdgm, { product_id: twin.product_id, display_group_id: G.eyeDrops }];
    const r = runMatcher({ ...base, items: items2, productDisplayGroupEdges: pdgm2, request: req({ symptomIds: [S.itchyEyes] }) });
    const eyeMatches = r.products.filter((p) => p.product.product_name === "Allergy Eye Drops");
    expect(eyeMatches.map((m) => m.catalogue_version_item_id)).toEqual([
      "10000000-0000-0000-0000-000000000002",
      "10000000-0000-0000-0000-00000000000A",
    ]);
  });

  it("filters by max price", () => {
    const r = runMatcher({ ...base, request: req({ symptomIds: [S.itchyEyes], maxPrice: 5 }) });
    expect(r.products.every((p) => p.effective_price <= 5)).toBe(true);
    expect(r.products.map((p) => p.product.product_name)).not.toContain("Premium Eye Drops");
  });

  it("filters by formulation", () => {
    const r = runMatcher({ ...base, request: req({ symptomIds: [S.itchyEyes], formulation: "eye_drops" }) });
    expect(r.products.map((p) => p.product.formulation)).toEqual(["eye_drops", "eye_drops"]);
  });

  it("filters out-of-stock when in_stock_only", () => {
    const r = runMatcher({ ...base, request: req({ symptomIds: [S.itchyEyes], inStockOnly: true }) });
    expect(r.products.map((p) => p.product.product_name)).not.toContain("Premium Eye Drops");
  });

  it('"all matching products" means all products approved for at least one selected symptom, not the whole catalogue', () => {
    const r = runMatcher({ ...base, request: req({ symptomIds: [S.blocked] }) });
    // Only nasal products matter; tablets/eye-drops are unrelated to blocked-nose.
    expect(r.products.map((p) => p.product.product_name).sort()).toEqual(["Saline Nasal Spray"]);
    expect(r.total).toBe(1);
  });

  it("throws UnknownSymptomError for unknown symptom ids", () => {
    expect(() =>
      runMatcher({ ...base, request: req({ symptomIds: ["00000000-0000-0000-0000-0000000000ff"] }) }),
    ).toThrow(UnknownSymptomError);
  });

  it("effectivePrice uses promotional price when lower", () => {
    expect(effectivePrice({ price: 5, promotional_price: 3 })).toBe(3);
    expect(effectivePrice({ price: 5, promotional_price: null })).toBe(5);
    expect(effectivePrice({ price: 5, promotional_price: 6 })).toBe(5);
  });

  it("aggregates multi-symptom selection deterministically", () => {
    const r = runMatcher({ ...base, request: req({ symptomIds: [S.itchyEyes, S.blocked] }) });
    // eye-drops:5, tablets:2, nasal:5 — nasal now included via blocked-nose.
    const groupIds = r.relevant_display_groups.map((g) => g.id).sort();
    expect(groupIds).toEqual([G.eyeDrops, G.nasal, G.tablets].sort());
    const saline = r.products.find((p) => p.product.product_name === "Saline Nasal Spray")!;
    expect(saline.matched_symptom_ids).toEqual([S.blocked]);
  });
});
