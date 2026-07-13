// Server-only Supabase repository for the finder read RPCs.
//
// The finder_* RPCs are SECURITY DEFINER and executable ONLY by service_role
// (Stage 2A.1). The kiosk is anonymous in the browser; the trusted server
// boundary is the TanStack server function, which resolves KIOSK_STORE_ID
// server-side and then calls Supabase with the service-role key. This module
// is filename-blocked from the client bundle (`.server.ts`).

import { createClient } from "@supabase/supabase-js";

import {
  bootstrapResponseSchema,
  catalogueItemSchema,
  catalogueVersionMetaSchema,
  displayGroupSchema,
  productDetailResponseSchema,
  storeIdentitySchema,
  symptomDisplayGroupEdgeSchema,
  symptomSchema,
  type BootstrapResponse,
  type CatalogueItem,
  type CatalogueVersionMeta,
  type DisplayGroup,
  type ProductDetailResponse,
  type StoreIdentity,
  type Symptom,
  type SymptomDisplayGroupEdge,
} from "./schemas";
import { z } from "zod";

function isNewApiKey(v: string) {
  return v.startsWith("sb_publishable_") || v.startsWith("sb_secret_");
}

function makeClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing — cannot reach the finder catalogue service. This key is server-only; never expose via VITE_ or the browser bundle.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (isNewApiKey(key) && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

// Raw wire-schema for finder_bootstrap. Parsed once, then normalised.
const bootstrapWireSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    generated_at: z.string(),
    store: storeIdentitySchema,
    symptoms: z.array(symptomSchema),
    display_groups: z.array(displayGroupSchema),
    catalogue_version: catalogueVersionMetaSchema,
    unavailable_reason: z.string().nullable().optional(),
  }),
  z.object({
    status: z.literal("unavailable"),
    generated_at: z.string(),
    store: storeIdentitySchema.nullable(),
    unavailable_reason: z.enum([
      "no_active_publication",
      "catalogue_version_incomplete",
      "catalogue_version_not_frozen",
    ]),
    symptoms: z.array(symptomSchema).optional(),
    display_groups: z.array(displayGroupSchema).optional(),
    catalogue_version: catalogueVersionMetaSchema.nullable().optional(),
  }),
  z.object({ status: z.literal("store_not_found") }),
]);

const snapshotWireSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    generated_at: z.string(),
    store: storeIdentitySchema,
    catalogue_version: catalogueVersionMetaSchema,
    items: z.array(catalogueItemSchema),
    symptom_display_group_mappings: z.array(symptomDisplayGroupEdgeSchema),
  }),
  z.object({
    status: z.literal("unavailable"),
    unavailable_reason: z.enum([
      "no_active_publication",
      "catalogue_version_not_frozen",
    ]),
  }),
  z.object({ status: z.literal("store_not_found") }),
]);

export type Snapshot =
  | {
      status: "ok";
      generatedAt: string;
      store: StoreIdentity;
      catalogueVersion: CatalogueVersionMeta;
      items: CatalogueItem[];
      symptomDisplayGroupEdges: SymptomDisplayGroupEdge[];
      symptoms: Symptom[];
      displayGroups: DisplayGroup[];
    }
  | { status: "unavailable"; reason: string; generatedAt: string; store: StoreIdentity | null }
  | { status: "store_not_found"; generatedAt: string };

export async function fetchBootstrap(storeId: string): Promise<BootstrapResponse> {
  const supabase = makeClient();
  const { data, error } = await supabase.rpc("finder_bootstrap", { _store: storeId });
  if (error) throw new Error(`finder_bootstrap failed: ${error.message}`);
  const parsed = bootstrapWireSchema.parse(data);
  const generatedAt =
    parsed.status === "store_not_found" ? new Date().toISOString() : parsed.generated_at;

  if (parsed.status === "store_not_found") {
    return {
      status: "unavailable",
      generated_at: generatedAt,
      store: null,
      reason: "store_not_found",
    };
  }
  if (parsed.status === "unavailable") {
    return {
      status: "unavailable",
      generated_at: parsed.generated_at,
      store: parsed.store,
      reason: parsed.unavailable_reason,
    };
  }
  return bootstrapResponseSchema.parse({
    status: "ok",
    generated_at: parsed.generated_at,
    store: parsed.store,
    symptoms: parsed.symptoms,
    display_groups: parsed.display_groups,
    catalogue_version: parsed.catalogue_version,
    formulations: [
      "tablet",
      "capsule",
      "oral_liquid",
      "nasal_spray",
      "nasal_drops",
      "eye_drops",
      "cream",
      "ointment",
      "lozenge",
      "powder",
      "other",
    ],
  });
}

export async function fetchSnapshot(storeId: string): Promise<Snapshot> {
  const supabase = makeClient();
  const [snapRes, bootstrap] = await Promise.all([
    supabase.rpc("finder_catalogue_snapshot", { _store: storeId }),
    fetchBootstrap(storeId),
  ]);
  if (snapRes.error) throw new Error(`finder_catalogue_snapshot failed: ${snapRes.error.message}`);
  const parsed = snapshotWireSchema.parse(snapRes.data);

  if (parsed.status === "store_not_found") {
    return { status: "store_not_found", generatedAt: new Date().toISOString() };
  }
  if (parsed.status === "unavailable") {
    return {
      status: "unavailable",
      reason: parsed.unavailable_reason,
      generatedAt: new Date().toISOString(),
      store: bootstrap.status === "unavailable" ? bootstrap.store : null,
    };
  }
  if (bootstrap.status !== "ok") {
    return {
      status: "unavailable",
      reason: "catalogue_version_incomplete",
      generatedAt: parsed.generated_at,
      store: parsed.store,
    };
  }
  return {
    status: "ok",
    generatedAt: parsed.generated_at,
    store: parsed.store,
    catalogueVersion: parsed.catalogue_version,
    items: parsed.items,
    symptomDisplayGroupEdges: parsed.symptom_display_group_mappings,
    symptoms: bootstrap.symptoms,
    displayGroups: bootstrap.display_groups,
  };
}

export async function fetchProductDetail(
  storeId: string,
  itemId: string,
): Promise<ProductDetailResponse> {
  const supabase = makeClient();
  const { data, error } = await supabase.rpc("finder_product_detail", {
    _store: storeId,
    _item: itemId,
  });
  if (error) throw new Error(`finder_product_detail failed: ${error.message}`);

  const wire = z
    .discriminatedUnion("status", [
      z.object({
        status: z.literal("ok"),
        generated_at: z.string(),
        catalogue_version: catalogueVersionMetaSchema,
        item: catalogueItemSchema,
      }),
      z.object({ status: z.literal("not_found") }),
      z.object({
        status: z.literal("unavailable"),
        unavailable_reason: z.enum(["no_active_publication", "catalogue_version_not_frozen"]),
      }),
      z.object({ status: z.literal("store_not_found") }),
    ])
    .parse(data);

  if (wire.status === "ok") {
    return productDetailResponseSchema.parse({
      status: "ok",
      generated_at: wire.generated_at,
      catalogue_version: wire.catalogue_version,
      product: wire.item,
    });
  }
  if (wire.status === "not_found") {
    return { status: "not_found" };
  }
  return {
    status: "unavailable",
    generated_at: new Date().toISOString(),
    store: null,
    reason: wire.status === "store_not_found" ? "store_not_found" : wire.unavailable_reason,
  };
}
