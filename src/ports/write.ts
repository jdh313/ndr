import type { AtomDraft, AtomId } from "../domain/index.ts";

export interface WritePort {
  captureAtom(draft: AtomDraft): Promise<AtomId>;
}
