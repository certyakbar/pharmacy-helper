// Client-side TanStack Query hooks + query key factory for the finder.
// All data comes from the server functions in service.functions.ts; there
// is no fallback to finder-data.ts.

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import {
  getFinderBootstrap,
  getProductDetail,
  searchProducts,
} from "./service.functions";
import type {
  BootstrapResponse,
  ProductDetailResponse,
  SearchRequest,
  SearchResponse,
} from "./schemas";

export const finderKeys = {
  all: ["finder"] as const,
  bootstrap: () => ["finder", "bootstrap"] as const,
  search: (catalogueVersionId: string | null, req: SearchRequest) =>
    ["finder", "search", catalogueVersionId, canonicalSearchKey(req)] as const,
  product: (catalogueVersionId: string | null, itemId: string) =>
    ["finder", "product", catalogueVersionId, itemId] as const,
};

// Deterministic serialisation so query keys are stable across renders and
// rapid filter changes cannot deliver out-of-order responses.
function canonicalSearchKey(req: SearchRequest): string {
  return JSON.stringify({
    symptomIds: [...req.symptomIds].sort(),
    displayGroupId: req.displayGroupId ?? null,
    formulation: req.formulation ?? null,
    maxPrice: req.maxPrice ?? null,
    inStockOnly: !!req.inStockOnly,
    sort: req.sort ?? "best_match",
  });
}

export function useBootstrap(): UseQueryResult<BootstrapResponse, Error> {
  return useQuery({
    queryKey: finderKeys.bootstrap(),
    queryFn: () => getFinderBootstrap(),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
  });
}

export function useProductSearch(
  req: SearchRequest | null,
  catalogueVersionId: string | null,
): UseQueryResult<SearchResponse, Error> {
  return useQuery({
    enabled: !!req && !!catalogueVersionId,
    queryKey: req
      ? finderKeys.search(catalogueVersionId, req)
      : ["finder", "search", "disabled"],
    queryFn: () => searchProducts({ data: req! }),
    placeholderData: (previous) => previous,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useProductDetailQuery(
  itemId: string | null,
  catalogueVersionId: string | null,
): UseQueryResult<ProductDetailResponse, Error> {
  return useQuery({
    enabled: !!itemId && !!catalogueVersionId,
    queryKey: itemId
      ? finderKeys.product(catalogueVersionId, itemId)
      : ["finder", "product", "disabled"],
    queryFn: () => getProductDetail({ data: { catalogueVersionItemId: itemId! } }),
    retry: 1,
  });
}
