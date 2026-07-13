// Server-only HMAC computation for handover codes. The pepper is loaded from
// HANDOVER_CODE_PEPPER at call time (never at module scope) so it is only
// resolved on the server and never included in the client bundle.
//
// The database RPC public.staff_open_handover_by_hash accepts the resulting
// hex digest. The raw code, the normalised code, and the pepper never leave
// this file.

import { createHmac, timingSafeEqual } from "node:crypto";

import { normaliseHandoverCode } from "./handover-code";

const MIN_PEPPER_LENGTH = 16;

function readPepper(): string {
  const pepper = process.env.HANDOVER_CODE_PEPPER;
  if (!pepper || pepper.length < MIN_PEPPER_LENGTH) {
    throw new Error(
      "HANDOVER_CODE_PEPPER is not configured (must be >= 16 chars)",
    );
  }
  return pepper;
}

/**
 * HMAC-SHA-256 of the normalised handover code, keyed by HANDOVER_CODE_PEPPER.
 * Returns a lowercase hex digest matching the shape enforced by the DB RPC
 * (`^[0-9a-f]{64}$`).
 */
export function computeHandoverCodeHash(rawCode: string): string {
  const normalised = normaliseHandoverCode(rawCode);
  const pepper = readPepper();
  return createHmac("sha256", pepper).update(normalised, "utf8").digest("hex");
}

/**
 * Constant-time hash comparison for callers that need to check whether a
 * user-supplied code matches a stored hash without leaking timing.
 */
export function handoverHashesEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}
