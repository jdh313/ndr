import type { Atom, AtomId } from "../domain/index.ts";

export interface CurrentFilter {
  readonly area?: string;
  readonly topic?: string;
}

export interface ReadPort {
  getAtom(id: AtomId): Promise<Atom>;
  getRawAtom(id: AtomId): Promise<string>;
  walkLineage(id: AtomId): Promise<Atom[]>;
  findBySlug(slug: string): Promise<Atom | null>;
  listCurrent(filter?: CurrentFilter): Promise<Atom[]>;
  searchFreeText(query: string): Promise<Atom[]>;
}
