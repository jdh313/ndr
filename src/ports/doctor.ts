import type { LedgerScan, Taxonomy } from "../domain/index.ts";

// Backend surface for `ndr doctor`. Kept apart from ReadPort because
// a doctor scan deliberately returns malformed files instead of skipping them
// (ndr:0138 governs the bulk read verbs, not health checks), and apart from
// WritePort because the one allowed mutation is a narrow pointer repair, not a
// capture.
export interface DoctorPort {
  // Read every markdown file in the ledger: schema-valid atoms plus malformed
  // entries (fence/YAML failures and schema rejections, with raw data when
  // available so missing-field classification stays in the domain layer).
  scanLedger(): Promise<LedgerScan>;

  // Load `.taxonomy/{areas,topics}.yaml`. Null when the taxonomy is missing or
  // unreadable — the caller skips taxonomy checks rather than failing the sweep.
  readTaxonomy(): Promise<Taxonomy | null>;

  // The one auto-fixable repair (curator contract): append a successor id
  // to a predecessor's `superseded_by:`. Touches only that field — untouched
  // frontmatter keeps its formatting (ndr:0134). Idempotent: appending a link
  // that is already present is a no-op write of the same content.
  repairBackPointer(predecessorPath: string, successorId: string): Promise<void>;
}
