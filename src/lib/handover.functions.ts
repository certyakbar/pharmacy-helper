// Authenticated staff-facing server function that opens a handover.
//
// Contract:
// - Caller submits { storeId, code } — the raw code entered by staff.
// - This server function normalises the code, computes the HMAC-SHA-256 hash
//   using HANDOVER_CODE_PEPPER (server env only), and calls the DB RPC
//   public.staff_open_handover_by_hash with the resulting hash.
// - The database performs membership validation, rate limiting, lookup,
//   audit insertion, and the atomic waiting -> opened transition.
// - The raw code, normalised code, and pepper never leave the server.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  InvalidHandoverCodeError,
  normaliseHandoverCode,
} from "./handover-code";

const openHandoverInput = z.object({
  storeId: z.string().uuid(),
  code: z.string().min(1).max(64),
});

// Nested handover / session shapes are opaque JSON returned by the DB RPC.
// Any-typed nested objects keep TanStack's serializer happy without hiding
// the discriminant on `status`.
export type StaffOpenHandoverResult =
  | { status: "not_authorised" }
  | { status: "not_found" }
  | { status: "expired" }
  | { status: "not_active" }
  | { status: "rate_limited"; retry_after_seconds: number }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { status: "ok"; newly_opened: boolean; handover: any; session: any };

export const openHandover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => openHandoverInput.parse(input))
  .handler(async ({ data, context }) => {
    // Normalise + hash on the server. If the code is unusable we still call
    // the RPC with a deterministic invalid-shape marker so the DB records the
    // failed attempt in its audit log. The DB's own shape validator will
    // classify this as not_found and store a sentinel fingerprint.
    let codeHash: string;
    try {
      const normalised = normaliseHandoverCode(data.code);
      const { computeHandoverCodeHash } = await import("./handover.server");
      codeHash = computeHandoverCodeHash(normalised);
    } catch (err) {
      if (err instanceof InvalidHandoverCodeError) {
        codeHash = "invalid-shape"; // fails the DB's [0-9a-f]{64} regex -> not_found + audit
      } else {
        throw err;
      }
    }

    const { data: rpc, error } = await context.supabase.rpc(
      "staff_open_handover_by_hash",
      { _store: data.storeId, _code_hash: codeHash },
    );
    if (error) throw new Error(error.message);
    return rpc as StaffOpenHandoverResult;
  });
