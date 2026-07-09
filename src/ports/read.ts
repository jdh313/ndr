import type { Atom, AtomId } from "../domain/index.ts";

export interface CurrentFilter {
  readonly label?: string;
}

export interface ReadPort {
  getAtom(id: AtomId): Promise<Atom>;
  getRawAtom(id: AtomId): Promise<string>;
  walkLineage(id: AtomId): Promise<Atom[]>;
  listCurrent(filter?: CurrentFilter): Promise<Atom[]>;
  searchFreeText(query: string): Promise<Atom[]>;
}
