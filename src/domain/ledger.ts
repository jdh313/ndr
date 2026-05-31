declare const LedgerBrand: unique symbol;
export type Ledger = string & { readonly [LedgerBrand]: true };

export function asLedger(path: string): Ledger {
  if (path.length === 0) {
    throw new Error("Ledger path must not be empty");
  }
  return path as Ledger;
}
