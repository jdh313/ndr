import type { AtomDraft, AtomId } from "../domain/index.ts";

// One predecessor flipped to `superseded` during a capture.
export interface SupersededRecord {
  readonly id: string;
  readonly path: string;
}

// One slug handed from a predecessor to the captured atom (ndr:0050, ndr:0051).
export interface AliasMove {
  readonly slug: string;
  readonly from: string;
  readonly to: string;
}

// Result of a successful capture. A single atom is captured — batch is out of
// scope, the caller loops — but one capture can still supersede several
// predecessors and move several slugs, so those stay arrays. The field names
// are the JSON wire shape printed by `ndr capture` and consumed by JUN-175.
export interface CaptureResult {
  readonly id: AtomId;
  readonly path: string;
  readonly superseded: readonly SupersededRecord[];
  readonly aliases_moved: readonly AliasMove[];
}

export interface WritePort {
  captureAtom(draft: AtomDraft): Promise<CaptureResult>;
}
