// Deterministic symptom→category→product matching engine.
//
// Pure, UI-independent, dependency-free. Consumed by the searchProducts
// server function and by the unit-test suite. Never imports from React,
// FinderProvider, or the seeded local demo catalogue.
//
// Contract (Stage 2A):
//   * Input: the raw catalogue snapshot returned by finder_catalogue_snapshot
//     plus a validated SearchRequest.
//   * Output: SearchOk shaped by ./schemas.
//   * Behaviour: only surfaces products with an approved relationship to at
//     least one selected symptom, via the approved symptom→display-group and
//     product→display-group edges. Score = sum of symptom→group weights over
//     the (product's groups ∩ selected symptom's groups) intersection.
//   * Ordering is fully deterministic: primary sort key + stable secondary
//     sort by product name then catalogue-version-item id.

import type {
  CatalogueItem,
  CatalogueVersionMeta,
  DisplayGroup,
  DisplayGroupMatch,
  MatchReasonEntry,
  ProductDisplayGroupEdge,
  ProductMatch,
  SearchOk,
  SearchRequest,
  SortOption,
  Symptom,
  SymptomDisplayGroupEdge,
} from "./schemas";

export class UnknownSymptomError extends Error {
  readonly unknownSymptomIds: string[];
  constructor(ids: string[]) {
    super(`unknown symptom id(s): ${ids.join(", ")}`);
    this.name = "UnknownSymptomError";
    this.unknownSymptomIds = ids;
  }
}

export interface MatcherInput {
  request: SearchRequest;
  symptoms: readonly Symptom[];
  displayGroups: readonly DisplayGroup[];
  items: readonly CatalogueItem[];
  productDisplayGroupEdges: readonly ProductDisplayGroupEdge[];
  symptomDisplayGroupEdges: readonly SymptomDisplayGroupEdge[];
  catalogueVersion: CatalogueVersionMeta;
  generatedAt: string;
}

export function effectivePrice(item: Pick<CatalogueItem, "price" | "promotional_price">): number {
  return item.promotional_price != null && item.promotional_price < item.price
    ? item.promotional_price
    : item.price;
}

function stableProductSort(sort: SortOption) {
  return (a: ProductMatch, b: ProductMatch): number => {
    if (sort === "best_match") {
      if (a.match_score !== b.match_score) return b.match_score - a.match_score;
      if (a.matched_symptom_ids.length !== b.matched_symptom_ids.length)
        return b.matched_symptom_ids.length - a.matched_symptom_ids.length;
      if (a.effective_price !== b.effective_price) return a.effective_price - b.effective_price;
    } else if (sort === "price_low_to_high") {
      if (a.effective_price !== b.effective_price) return a.effective_price - b.effective_price;
    } else if (sort === "price_high_to_low") {
      if (a.effective_price !== b.effective_price) return b.effective_price - a.effective_price;
    } else if (sort === "pack_size") {
      const c = a.product.pack_size.localeCompare(b.product.pack_size);
      if (c !== 0) return c;
    }
    // Stable secondary sort — deterministic for equal primary keys.
    const nameCmp = a.product.product_name.localeCompare(b.product.product_name);
    if (nameCmp !== 0) return nameCmp;
    return a.catalogue_version_item_id.localeCompare(b.catalogue_version_item_id);
  };
}

export function runMatcher(input: MatcherInput): SearchOk {
  const {
    request,
    symptoms,
    displayGroups,
    items,
    productDisplayGroupEdges,
    symptomDisplayGroupEdges,
    catalogueVersion,
    generatedAt,
  } = input;

  // 1. Validate symptom IDs against the active symptom set.
  const symptomById = new Map(symptoms.map((s) => [s.id, s]));
  const unknown = request.symptomIds.filter((id) => !symptomById.has(id));
  if (unknown.length > 0) throw new UnknownSymptomError(unknown);
  const selectedSymptomIds = new Set(request.symptomIds);

  const groupById = new Map(displayGroups.map((g) => [g.id, g]));

  // 2. Resolve active S→G mappings for selected symptoms only.
  //    Weight per group is summed across contributing selected symptoms.
  //    Also record which of the selected symptoms contributed to each group.
  const groupWeight = new Map<string, number>();
  const groupSymptoms = new Map<string, Set<string>>();
  for (const edge of symptomDisplayGroupEdges) {
    if (!selectedSymptomIds.has(edge.symptom_id)) continue;
    if (!groupById.has(edge.display_group_id)) continue; // group must be active
    groupWeight.set(
      edge.display_group_id,
      (groupWeight.get(edge.display_group_id) ?? 0) + edge.relevance_weight,
    );
    let bag = groupSymptoms.get(edge.display_group_id);
    if (!bag) {
      bag = new Set<string>();
      groupSymptoms.set(edge.display_group_id, bag);
    }
    bag.add(edge.symptom_id);
  }
  // 3. Exclude groups with zero relevance to the selection.
  const relevantGroupIds = new Set(
    Array.from(groupWeight.entries())
      .filter(([, w]) => w > 0)
      .map(([id]) => id),
  );

  // Optional filter: caller narrowed to a single display group.
  const groupFilter = request.displayGroupId
    ? new Set([request.displayGroupId])
    : relevantGroupIds;

  // Index approved P→G edges.
  const productGroups = new Map<string, Set<string>>();
  for (const edge of productDisplayGroupEdges) {
    let bag = productGroups.get(edge.product_id);
    if (!bag) {
      bag = new Set<string>();
      productGroups.set(edge.product_id, bag);
    }
    bag.add(edge.display_group_id);
  }

  // 4-8. Score every catalogue item.
  const matches: ProductMatch[] = [];
  for (const item of items) {
    // 5. Restrict to products in at least one relevant (and optionally
    //    filter-narrowed) group.
    const productGroupIds = productGroups.get(item.product_id) ?? new Set<string>();
    const matchedGroupIds: string[] = [];
    for (const gid of productGroupIds) {
      if (!relevantGroupIds.has(gid)) continue;
      if (!groupFilter.has(gid)) continue;
      matchedGroupIds.push(gid);
    }
    if (matchedGroupIds.length === 0) continue; // 6. Excluded — no approved relationship.

    // 8. Deterministic score + matched symptoms union + structured reason.
    let score = 0;
    const matchedSymptomSet = new Set<string>();
    const reason: MatchReasonEntry[] = [];
    for (const gid of matchedGroupIds) {
      const group = groupById.get(gid)!;
      const weight = groupWeight.get(gid) ?? 0;
      const symptomsForGroup = Array.from(groupSymptoms.get(gid) ?? []).sort();
      symptomsForGroup.forEach((sid) => matchedSymptomSet.add(sid));
      score += weight;
      reason.push({
        display_group_id: gid,
        display_group_code: group.code,
        display_group_name: group.name,
        matched_symptom_ids: symptomsForGroup,
        weight,
      });
    }
    if (matchedSymptomSet.size === 0) continue;

    // 7. Filters (formulation, price, stock).
    if (request.formulation && item.formulation !== request.formulation) continue;
    const price = effectivePrice(item);
    if (request.maxPrice != null && price > request.maxPrice) continue;
    if (request.inStockOnly && item.stock_status !== "in_stock" && item.stock_status !== "low_stock")
      continue;

    reason.sort((a, b) => b.weight - a.weight || a.display_group_code.localeCompare(b.display_group_code));

    matches.push({
      catalogue_version_item_id: item.id,
      product: item,
      matched_symptom_ids: Array.from(matchedSymptomSet).sort(),
      matched_display_group_ids: matchedGroupIds.sort(),
      match_score: score,
      match_reason: reason,
      effective_price: price,
    });
  }

  matches.sort(stableProductSort(request.sort));

  // Build display-group summaries scoped to the post-filter product set so
  // the UI never advertises a group that has no visible products.
  const productsPerGroup = new Map<string, number>();
  for (const m of matches)
    for (const gid of m.matched_display_group_ids)
      productsPerGroup.set(gid, (productsPerGroup.get(gid) ?? 0) + 1);

  const relevantGroups: DisplayGroupMatch[] = Array.from(relevantGroupIds)
    .filter((gid) => groupFilter.has(gid))
    .map((gid) => {
      const g = groupById.get(gid)!;
      return {
        id: gid,
        code: g.code,
        name: g.name,
        customer_description: g.customer_description,
        matched_symptom_ids: Array.from(groupSymptoms.get(gid) ?? []).sort(),
        relevance_score: groupWeight.get(gid) ?? 0,
        available_product_count: productsPerGroup.get(gid) ?? 0,
      };
    })
    .sort(
      (a, b) =>
        b.relevance_score - a.relevance_score ||
        b.available_product_count - a.available_product_count ||
        a.name.localeCompare(b.name),
    );

  return {
    status: "ok",
    generated_at: generatedAt,
    catalogue_version: catalogueVersion,
    relevant_display_groups: relevantGroups,
    products: matches,
    total: matches.length,
  };
}
