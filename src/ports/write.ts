import type { AtomDraft, AtomId } from "../domain/index.ts";

// One predecessor flipped to `superseded` during a capture.
export interface SupersededRecord {
  readonly id: string;
  readonly path: string;
}

// Result of a successful capture. A single atom is captured — batch is out of
// scope, the caller loops — but one capture can still supersede several
// predecessors, so that stays an array. The field names are the JSON wire
// shape printed by `ndr capture`.
export interface CaptureResult {
  readonly id: AtomId;
  readonly path: string;
  readonly superseded: readonly SupersededRecord[];
  // Non-blocking warnings surfaced to the caller (binds narrowing,
  // cross-author supersession). Exit code stays 0.
  readonly advisories: readonly string[];
}

export interface WritePort {
  captureAtom(draft: AtomDraft): Promise<CaptureResult>;
}
