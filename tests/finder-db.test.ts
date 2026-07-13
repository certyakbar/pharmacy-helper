// Database-backed smoke tests: exercise the finder RPCs against the real
// seeded catalogue. Skipped automatically when Supabase env vars are absent
// so the pure-unit suite still runs standalone.

import { beforeAll, describe, expect, it } from "vitest";

import { productDetailResponseSchema } from "../src/lib/finder/schemas";

const STORE_ID = "00000000-0000-0000-0000-000000000101";

const hasEnv = Boolean(
  process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_PUBLISHABLE_KEY,
);
const d = hasEnv ? describe : describe.skip;

d("finder RPCs (seeded database)", () => {
  let bootstrap: Awaited<
    ReturnType<typeof import("../src/lib/finder/repository.server").fetchBootstrap>
  >;
  let snapshot: Awaited<
    ReturnType<typeof import("../src/lib/finder/repository.server").fetchSnapshot>
  >;

  beforeAll(async () => {
    process.env.KIOSK_STORE_ID = STORE_ID;
    const repo = await import("../src/lib/finder/repository.server");
    bootstrap = await repo.fetchBootstrap(STORE_ID);
    snapshot = await repo.fetchSnapshot(STORE_ID);
  });

  it("bootstrap resolves the active v1 publication", () => {
    if (bootstrap.status !== "ok") throw new Error(`bootstrap ${bootstrap.status}`);
    expect(bootstrap.catalogue_version.version_number).toBe(1);
    expect(bootstrap.symptoms).toHaveLength(6);
    expect(bootstrap.display_groups).toHaveLength(3);
  });

  it("watery-eyes returns eye-drop products only", async () => {
    if (bootstrap.status !== "ok" || snapshot.status !== "ok")
      throw new Error("bootstrap/snapshot not ok");
    const { runMatcher } = await import("../src/lib/finder/matching");
    const watery = bootstrap.symptoms.find((s) => s.code === "watery-eyes")!;
    const r = runMatcher({
      request: { symptomIds: [watery.id], sort: "best_match", inStockOnly: false },
      symptoms: snapshot.symptoms,
      displayGroups: snapshot.displayGroups,
      items: snapshot.items,
      symptomDisplayGroupEdges: snapshot.symptomDisplayGroupEdges,
      catalogueVersion: snapshot.catalogueVersion,
      generatedAt: snapshot.generatedAt,
    });
    expect(r.products.length).toBeGreaterThan(0);
    for (const p of r.products) expect(p.product.formulation).toBe("eye_drops");
  });

  it("blocked-nose returns nasal products only and excludes unrelated ones", async () => {
    if (bootstrap.status !== "ok" || snapshot.status !== "ok")
      throw new Error("bootstrap/snapshot not ok");
    const { runMatcher } = await import("../src/lib/finder/matching");
    const blocked = bootstrap.symptoms.find((s) => s.code === "blocked-nose")!;
    const r = runMatcher({
      request: { symptomIds: [blocked.id], sort: "best_match", inStockOnly: false },
      symptoms: snapshot.symptoms,
      displayGroups: snapshot.displayGroups,
      items: snapshot.items,
      symptomDisplayGroupEdges: snapshot.symptomDisplayGroupEdges,
      catalogueVersion: snapshot.catalogueVersion,
      generatedAt: snapshot.generatedAt,
    });
    const names = r.products.map((p) => p.product.product_name);
    expect(names.length).toBeGreaterThan(0);
    for (const p of r.products) expect(p.product.formulation).toBe("nasal_spray");
    expect(names).not.toContain("Azelastine Eye Drops");
    expect(names).not.toContain("Cetirizine 10 mg Tablets");
  });

  it("product detail returns a schema-valid ProductDetailResponse for a real item", async () => {
    if (snapshot.status !== "ok") throw new Error("snapshot not ok");
    expect(snapshot.items.length).toBeGreaterThan(0);
    const target = snapshot.items[0]!;
    const { fetchProductDetail } = await import("../src/lib/finder/repository.server");
    const res = await fetchProductDetail(STORE_ID, target.id);
    // Full schema validation — will fail if any required field (incl. label) is missing.
    const parsed = productDetailResponseSchema.parse(res);
    if (parsed.status !== "ok") throw new Error(`product detail ${parsed.status}`);
    expect(parsed.product.id).toBe(target.id);
    // Item belongs to the currently active published catalogue version.
    expect(parsed.catalogue_version.id).toBe(snapshot.catalogueVersion.id);
    expect(parsed.catalogue_version.publication_id).toBe(
      snapshot.catalogueVersion.publication_id,
    );
    // Sanity: the item is also in the store's snapshot.
    expect(snapshot.items.some((it) => it.id === parsed.product.id)).toBe(true);
  });

  it("product detail refuses items outside the published catalogue", async () => {
    const { fetchProductDetail } = await import("../src/lib/finder/repository.server");
    const missing = await fetchProductDetail(STORE_ID, "00000000-0000-0000-0000-0000000000ff");
    expect(missing.status).toBe("not_found");
  });

  it("finder RPCs cannot be executed directly by anon or authenticated callers", async () => {
    const url = process.env.SUPABASE_URL!;
    const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY!;

    async function call(fn: string, body: Record<string, unknown>) {
      return fetch(`${url}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    }

    const b = await call("finder_bootstrap", { _store: STORE_ID });
    const s = await call("finder_catalogue_snapshot", { _store: STORE_ID });
    const p = await call("finder_product_detail", {
      _store: STORE_ID,
      _item: "00000000-0000-0000-0000-0000000000ff",
    });

    // PostgREST returns 401/403/404 for un-granted RPCs; anything but 2xx is a pass.
    for (const r of [b, s, p]) {
      expect(r.ok).toBe(false);
      expect([401, 403, 404]).toContain(r.status);
    }
  });
});
