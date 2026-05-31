import type { Atom, AtomId } from "../domain/index.ts";

export interface ReadPort {
  getAtom(id: AtomId): Promise<Atom>;
  walkLineage(id: AtomId): Promise<Atom[]>;
  searchByTopic(area: string, topic: string): Promise<Atom[]>;
  searchFreeText(query: string): Promise<Atom[]>;
}
