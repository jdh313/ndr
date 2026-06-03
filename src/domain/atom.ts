import { FrontmatterSchema, type Frontmatter } from "./schema.ts";

declare const AtomIdBrand: unique symbol;
export type AtomId = string & { readonly [AtomIdBrand]: true };

declare const SlugBrand: unique symbol;
export type Slug = string & { readonly [SlugBrand]: true };

// Atom ids come in two shapes, both accepted forever (ndr:0144):
//   - legacy `^\d{4}$` — the ~130 sequential ids minted before the scheme change.
//   - new `^[0-9a-z]{6}$` — locally-generated short Crockford base32, no backfill.
// Keep this regex in lockstep with `AtomIdString` in schema.ts.
export const ATOM_ID_PATTERN = /^(?:\d{4}|[0-9a-z]{6})$/;

export function asAtomId(value: string): AtomId {
  if (!ATOM_ID_PATTERN.test(value)) {
    throw new Error(
      `Invalid AtomId: ${JSON.stringify(value)} (want 4-digit legacy or 6-char base32 string)`,
    );
  }
  return value as AtomId;
}

// Crockford base32, lowercased: digits + a–z minus i, l, o, u (ndr:0144). 32 symbols,
// so a uniformly random byte maps to a symbol with no modulo bias (256 / 32 = 8 exactly).
const CROCKFORD_LOWER = "0123456789abcdefghjkmnpqrstvwxyz";
const ATOM_ID_LENGTH = 6;

// Mint a fresh atom id from a CSPRNG — stateless, no ledger scan, no max()+1 (ndr:0144).
// Cross-file collision is caught by a CI duplicate-id scan (separate ticket); the adapter
// also re-rolls on a same-ledger collision before writing.
export function generateAtomId(): AtomId {
  const bytes = new Uint8Array(ATOM_ID_LENGTH);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) {
    out += CROCKFORD_LOWER[b % 32];
  }
  return out as AtomId;
}

export function asSlug(value: string): Slug {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(value)) {
    throw new Error(`Invalid Slug: ${JSON.stringify(value)} (want kebab-case)`);
  }
  return value as Slug;
}

export type Reference =
  | { grain: "atom-id"; id: AtomId }
  | { grain: "slug"; slug: Slug }
  | { grain: "topic"; area: string; topic: string };

export interface Atom {
  readonly frontmatter: Frontmatter;
  readonly body: string;
}

export interface AtomDraft {
  readonly frontmatter: Omit<Frontmatter, "id"> & { id?: string };
  readonly body: string;
}

export { FrontmatterSchema };
export type { Frontmatter };
