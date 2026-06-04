import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Per-repo ledger config (JUN-175). A repo opts in by placing `.ndr.toml` at
// or above the CWD; the vault default stays zero-config (ndr:0147). Corpus
// root is a runtime config/CWD concern, not a schema concept (ndr:0130).
export const CONFIG_BASENAME = ".ndr.toml";

// Vault default: resolved at runtime from the home directory (ndr:0147).
export const DEFAULT_LEDGER_PATH = path.join(os.homedir(), "Loose Ends", "Decisions");

// A present-but-broken .ndr.toml fails loudly rather than silently falling
// back to the vault default — same philosophy as targeted reads (ndr:0138).
export class RepoConfigError extends Error {}

export interface RepoConfig {
  // Absolute. Relative `ledger` values resolve against the config file's
  // directory; a leading `~/` expands to the home directory.
  readonly ledger: string;
  readonly project?: string;
  readonly configPath: string;
}

export function parseRepoConfig(configPath: string, raw: string): RepoConfig {
  let parsed: unknown;
  try {
    parsed = Bun.TOML.parse(raw);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new RepoConfigError(`invalid TOML in ${configPath}: ${detail}`);
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new RepoConfigError(`invalid config in ${configPath}: expected a TOML table`);
  }
  const table = parsed as Record<string, unknown>;

  const ledger = table["ledger"];
  if (typeof ledger !== "string" || ledger.length === 0) {
    throw new RepoConfigError(
      `invalid config in ${configPath}: "ledger" must be a non-empty string`,
    );
  }

  const project = table["project"];
  if (project !== undefined && typeof project !== "string") {
    throw new RepoConfigError(`invalid config in ${configPath}: "project" must be a string`);
  }

  const expanded = ledger.startsWith("~/") ? path.join(os.homedir(), ledger.slice(2)) : ledger;
  const absolute = path.isAbsolute(expanded)
    ? expanded
    : path.resolve(path.dirname(configPath), expanded);

  return { ledger: absolute, project, configPath };
}

// Walk from startDir up to the filesystem root, returning the first
// `.ndr.toml` found, or undefined when no repo has opted in.
export function findRepoConfig(startDir: string): RepoConfig | undefined {
  let dir = path.resolve(startDir);
  for (;;) {
    const candidate = path.join(dir, CONFIG_BASENAME);
    if (fs.existsSync(candidate)) {
      return parseRepoConfig(candidate, fs.readFileSync(candidate, "utf8"));
    }
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

// Ledger resolution order: --ledger flag > .ndr.toml walk-up from startDir >
// vault default. (`ndr capture` additionally honors the draft payload's
// `vault_decisions` between the flag and the walk-up — see captureCommand.)
export function resolveLedgerPath(flag: string | undefined, startDir: string): string {
  if (flag !== undefined) return flag;
  const config = findRepoConfig(startDir);
  if (config !== undefined) return config.ledger;
  return DEFAULT_LEDGER_PATH;
}
