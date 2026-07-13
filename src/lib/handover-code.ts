// Shared handover-code domain logic used by both creation and lookup paths.
// Kept UI-free and dependency-free so it can be imported from browser, server
// functions, and tests without pulling in Node built-ins.
//
// Format: 8 characters, Crockford Base32 alphabet
// (0123456789ABCDEFGHJKMNPQRSTVWXYZ — I, L, O, U removed to reduce misreads).
// Users may enter the code with hyphens or whitespace; those are stripped
// before validation. Case is normalised to upper.

const CROCKFORD_ALPHABET = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$/;

export class InvalidHandoverCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidHandoverCodeError";
  }
}

/**
 * Normalise a raw handover code entered by staff.
 *
 * - Trims surrounding whitespace.
 * - Removes internal whitespace and hyphens.
 * - Uppercases.
 * - Enforces the 8-character Crockford Base32 shape.
 *
 * This is the single source of truth for what counts as a valid handover
 * code, and MUST match the shape used when the code was originally created.
 */
export function normaliseHandoverCode(raw: string | null | undefined): string {
  if (raw == null) throw new InvalidHandoverCodeError("handover code required");
  const compact = raw.replace(/[\s-]+/g, "").toUpperCase();
  if (compact.length !== 8) {
    throw new InvalidHandoverCodeError("handover code must be 8 characters");
  }
  if (!CROCKFORD_ALPHABET.test(compact)) {
    throw new InvalidHandoverCodeError("handover code contains invalid characters");
  }
  return compact;
}
