// Client-safe schemas + inferred TypeScript types for the finder service.
// These are the wire contracts for the customer-facing search feature.

import { z } from "zod";

// -------------------------------------------------------------------------
// Enumerations mirrored from the database. Keeping these as string unions
// lets the matching engine and the UI share one source of truth without
// depending on the generated `Database` types (which are only reachable
// from files that can see the Supabase client).
// -------------------------------------------------------------------------
export const FORMULATIONS = [
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
] as const;
export const formulationSchema = z.enum(FORMULATIONS);
export type Formulation = z.infer<typeof formulationSchema>;

export const STOCK_STATUSES = ["in_stock", "low_stock", "out_of_stock", "ask_staff"] as const;
export const stockStatusSchema = z.enum(STOCK_STATUSES);
export type StockStatus = z.infer<typeof stockStatusSchema>;

export const DROWSINESS_LEVELS = ["none", "low", "moderate", "high"] as const;
export const drowsinessLevelSchema = z.enum(DROWSINESS_LEVELS);
export type DrowsinessLevel = z.infer<typeof drowsinessLevelSchema>;

export const SORT_OPTIONS = [
  "best_match",
  "price_low_to_high",
  "price_high_to_low",
  "pack_size",
] as const;
export const sortOptionSchema = z.enum(SORT_OPTIONS);
export type SortOption = z.infer<typeof sortOptionSchema>;

// -------------------------------------------------------------------------
// Shared value objects
// -------------------------------------------------------------------------
const uuid = z.string().uuid();

export const symptomSchema = z.object({
  id: uuid,
  code: z.string(),
  name: z.string(),
  customer_description: z.string().nullable(),
  icon: z.string().nullable(),
  display_order: z.number().int(),
});
export type Symptom = z.infer<typeof symptomSchema>;

export const displayGroupSchema = z.object({
  id: uuid,
  code: z.string(),
  name: z.string(),
  customer_description: z.string().nullable(),
  icon: z.string().nullable(),
  display_order: z.number().int(),
});
export type DisplayGroup = z.infer<typeof displayGroupSchema>;

export const catalogueVersionMetaSchema = z.object({
  id: uuid,
  version_number: z.number().int(),
  label: z.string().nullable(),
  frozen_at: z.string(),
  published_at: z.string(),
  publication_id: uuid,
});
export type CatalogueVersionMeta = z.infer<typeof catalogueVersionMetaSchema>;

export const storeIdentitySchema = z.object({ id: uuid, name: z.string() });
export type StoreIdentity = z.infer<typeof storeIdentitySchema>;

// -------------------------------------------------------------------------
// Immutable catalogue snapshot rows (as returned by finder_catalogue_snapshot)
// -------------------------------------------------------------------------
export const catalogueItemSchema = z.object({
  id: uuid,
  product_id: uuid,
  retailer_sku: z.string(),
  product_name: z.string(),
  brand_name: z.string().nullable(),
  active_ingredient: z.string(),
  strength: z.string().nullable(),
  formulation: formulationSchema,
  pack_size: z.string(),
  customer_summary: z.string().nullable(),
  warning_text: z.string().nullable(),
  image_url: z.string().nullable(),
  drowsiness_level: drowsinessLevelSchema,
  requires_staff_help: z.boolean(),
  treatment_group_code: z.string().nullable(),
  treatment_group_name: z.string().nullable(),
  display_group_codes: z.array(z.string()),
  price: z.coerce.number(),
  promotional_price: z.coerce.number().nullable(),
  currency: z.string(),
  stock_quantity: z.number().int(),
  stock_status: stockStatusSchema,
  aisle: z.string().nullable(),
  bay: z.string().nullable(),
  shelf: z.string().nullable(),
  available_for_display: z.boolean(),
});
export type CatalogueItem = z.infer<typeof catalogueItemSchema>;

export const productDisplayGroupEdgeSchema = z.object({
  product_id: uuid,
  display_group_id: uuid,
});
export type ProductDisplayGroupEdge = z.infer<typeof productDisplayGroupEdgeSchema>;

export const symptomDisplayGroupEdgeSchema = z.object({
  symptom_id: uuid,
  display_group_id: uuid,
  relevance_weight: z.number().int().min(0).max(10),
});
export type SymptomDisplayGroupEdge = z.infer<typeof symptomDisplayGroupEdgeSchema>;

// -------------------------------------------------------------------------
// Bootstrap response
// -------------------------------------------------------------------------
export const catalogueUnavailableSchema = z.object({
  status: z.literal("unavailable"),
  generated_at: z.string(),
  store: storeIdentitySchema.nullable(),
  reason: z.enum([
    "no_active_publication",
    "catalogue_version_incomplete",
    "catalogue_version_not_frozen",
    "store_not_found",
  ]),
});
export type CatalogueUnavailable = z.infer<typeof catalogueUnavailableSchema>;

export const bootstrapOkSchema = z.object({
  status: z.literal("ok"),
  generated_at: z.string(),
  store: storeIdentitySchema,
  symptoms: z.array(symptomSchema),
  display_groups: z.array(displayGroupSchema),
  catalogue_version: catalogueVersionMetaSchema,
  formulations: z.array(formulationSchema),
});
export type BootstrapOk = z.infer<typeof bootstrapOkSchema>;

export const bootstrapResponseSchema = z.discriminatedUnion("status", [
  bootstrapOkSchema,
  catalogueUnavailableSchema,
]);
export type BootstrapResponse = z.infer<typeof bootstrapResponseSchema>;

// -------------------------------------------------------------------------
// Search request / response
// -------------------------------------------------------------------------
export const searchRequestSchema = z.object({
  symptomIds: z.array(uuid).min(1),
  displayGroupId: uuid.optional(),
  formulation: formulationSchema.optional(),
  maxPrice: z.number().positive().optional(),
  inStockOnly: z.boolean().optional().default(false),
  sort: sortOptionSchema.optional().default("best_match"),
});
export type SearchRequest = z.infer<typeof searchRequestSchema>;

export const matchReasonEntrySchema = z.object({
  display_group_id: uuid,
  display_group_code: z.string(),
  display_group_name: z.string(),
  matched_symptom_ids: z.array(uuid),
  weight: z.number().int(),
});
export type MatchReasonEntry = z.infer<typeof matchReasonEntrySchema>;

export const displayGroupMatchSchema = z.object({
  id: uuid,
  code: z.string(),
  name: z.string(),
  customer_description: z.string().nullable(),
  matched_symptom_ids: z.array(uuid),
  relevance_score: z.number().int(),
  available_product_count: z.number().int(),
});
export type DisplayGroupMatch = z.infer<typeof displayGroupMatchSchema>;

export const productMatchSchema = z.object({
  catalogue_version_item_id: uuid,
  product: catalogueItemSchema,
  matched_symptom_ids: z.array(uuid),
  matched_display_group_ids: z.array(uuid),
  match_score: z.number().int(),
  match_reason: z.array(matchReasonEntrySchema),
  effective_price: z.number(),
});
export type ProductMatch = z.infer<typeof productMatchSchema>;

export const searchOkSchema = z.object({
  status: z.literal("ok"),
  generated_at: z.string(),
  catalogue_version: catalogueVersionMetaSchema,
  relevant_display_groups: z.array(displayGroupMatchSchema),
  products: z.array(productMatchSchema),
  total: z.number().int(),
});
export type SearchOk = z.infer<typeof searchOkSchema>;

export const searchResponseSchema = z.discriminatedUnion("status", [
  searchOkSchema,
  catalogueUnavailableSchema,
]);
export type SearchResponse = z.infer<typeof searchResponseSchema>;

// -------------------------------------------------------------------------
// Product detail
// -------------------------------------------------------------------------
export const productDetailOkSchema = z.object({
  status: z.literal("ok"),
  generated_at: z.string(),
  catalogue_version: catalogueVersionMetaSchema,
  product: catalogueItemSchema,
});
export type ProductDetailOk = z.infer<typeof productDetailOkSchema>;

export const productDetailNotFoundSchema = z.object({
  status: z.literal("not_found"),
});

export const productDetailResponseSchema = z.discriminatedUnion("status", [
  productDetailOkSchema,
  productDetailNotFoundSchema,
  catalogueUnavailableSchema,
]);
export type ProductDetailResponse = z.infer<typeof productDetailResponseSchema>;
