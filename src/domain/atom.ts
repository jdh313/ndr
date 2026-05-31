import { FrontmatterSchema, type Frontmatter } from "./schema.ts";

declare const AtomIdBrand: unique symbol;
export type AtomId = string & { readonly [AtomIdBrand]: true };

declare const SlugBrand: unique symbol;
export type Slug = string & { readonly [SlugBrand]: true };

export function asAtomId(value: string): AtomId {
  if (!/^\d{4}$/.test(value)) {
    throw new Error(`Invalid AtomId: ${JSON.stringify(value)} (want 4-digit zero-padded string)`);
  }
  return value as AtomId;
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
