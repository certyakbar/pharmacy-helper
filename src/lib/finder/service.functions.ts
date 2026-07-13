// Customer-facing finder server functions. Callable by anonymous kiosk
// clients (Stage 2B will wire them into the UI). No admin key, no bypassed
// RLS: everything routes through the finder_* SECURITY DEFINER RPCs.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  bootstrapResponseSchema,
  productDetailResponseSchema,
  searchOkSchema,
  searchRequestSchema,
  searchResponseSchema,
  type BootstrapResponse,
  type ProductDetailResponse,
  type SearchResponse,
} from "./schemas";

const STORE_ENV_KEY = "KIOSK_STORE_ID";

function resolveStoreId(): string {
  const raw = process.env[STORE_ENV_KEY];
  if (!raw) {
    throw new Error(
      `${STORE_ENV_KEY} is not configured. Set it to the pilot store id in Lovable Cloud secrets.`,
    );
  }
  return raw;
}

export const getFinderBootstrap = createServerFn({ method: "GET" }).handler(
  async (): Promise<BootstrapResponse> => {
    const { fetchBootstrap } = await import("./repository.server");
    return bootstrapResponseSchema.parse(await fetchBootstrap(resolveStoreId()));
  },
);

export const searchProducts = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => searchRequestSchema.parse(input))
  .handler(async ({ data }): Promise<SearchResponse> => {
    const [{ fetchSnapshot }, { runMatcher, UnknownSymptomError }] = await Promise.all([
      import("./repository.server"),
      import("./matching"),
    ]);
    const snapshot = await fetchSnapshot(resolveStoreId());
    if (snapshot.status !== "ok") {
      return searchResponseSchema.parse({
        status: "unavailable",
        generated_at: snapshot.generatedAt,
        store: "store" in snapshot ? snapshot.store : null,
        reason: snapshot.status === "store_not_found" ? "store_not_found" : snapshot.reason,
      });
    }
    try {
      const result = runMatcher({
        request: data,
        symptoms: snapshot.symptoms,
        displayGroups: snapshot.displayGroups,
        items: snapshot.items,
        symptomDisplayGroupEdges: snapshot.symptomDisplayGroupEdges,
        catalogueVersion: snapshot.catalogueVersion,
        generatedAt: snapshot.generatedAt,
      });
      return searchOkSchema.parse(result);
    } catch (err) {
      if (err instanceof UnknownSymptomError) {
        throw new Error(`Unknown symptom id(s): ${err.unknownSymptomIds.join(", ")}`);
      }
      throw err;
    }
  });

export const getProductDetail = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ catalogueVersionItemId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }): Promise<ProductDetailResponse> => {
    const { fetchProductDetail } = await import("./repository.server");
    return productDetailResponseSchema.parse(
      await fetchProductDetail(resolveStoreId(), data.catalogueVersionItemId),
    );
  });
