import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Per-repo ledger config. A repo opts in by placing `.ndr.toml` at
// or above the CWD — `ndr init` scaffolds it. There is no built-in default
// ledger; a personal default is just a `.ndr.toml` higher up the walk (e.g.
// at `~`). Corpus root is a runtime config/CWD concern, not a schema concept
// (ndr:0130).
export const CONFIG_BASENAME = ".ndr.toml";

// A present-but-broken .ndr.toml fails loudly rather than silently falling
// back — same philosophy as targeted reads (ndr:0138).
export class RepoConfigError extends Error {}

export interface RepoConfig {
  // Absolute. Relative `ledger` values resolve against the config file's
  // directory; a leading `~/` expands to the home directory.
  readonly ledger: string;
  // Required, mirroring the atom frontmatter schema (`schema.ts` requires a
  // non-empty `project` on every atom, per ndr:0130). A `.ndr.toml` missing
  // `project` is broken and fails loudly rather than resolving projectless.
  readonly project: string;
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
  if (typeof project !== "string" || project.length === 0) {
    throw new RepoConfigError(
      `invalid config in ${configPath}: "project" must be a non-empty string`,
    );
  }
  // Pre-migration ledgers carry `project = "[[name]]"`. Atoms want the plain
  // form, so a stale config here silently seeds an invalid atom field.
  if (/^\[\[.*\]\]$/.test(project)) {
    throw new RepoConfigError(
      `invalid config in ${configPath}: "project" must be a plain string, not a wikilink — write \`${project.slice(2, -2)}\`, not \`${project}\``,
    );
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

// Where a resolved ledger came from — surfaced by `ndr status` and used to
// keep the source string in lockstep with the resolution order itself.
export type LedgerSource =
  | { readonly kind: "flag" }
  | { readonly kind: "env" }
  | { readonly kind: "config"; readonly configPath: string }
  | { readonly kind: "none" };

export interface ResolvedLedger {
  readonly path: string;
  readonly source: LedgerSource;
}

// Ledger resolution order: --ledger flag > NDR_LEDGER env > .ndr.toml walk-up
// from startDir > none. (`ndr capture` additionally honors the draft payload's
// `vault_decisions` between env and the walk-up — see captureCommand.) The
// non-throwing core; `resolveLedgerPath` adds the error for the verbs that
// require a ledger, `status` reports the `none` case instead.
export function resolveLedger(flag: string | undefined, startDir: string): ResolvedLedger {
  if (flag !== undefined) return { path: flag, source: { kind: "flag" } };
  const env = process.env.NDR_LEDGER;
  if (env) return { path: env, source: { kind: "env" } };
  const config = findRepoConfig(startDir);
  if (config !== undefined) {
    return { path: config.ledger, source: { kind: "config", configPath: config.configPath } };
  }
  return { path: "", source: { kind: "none" } };
}

export function resolveLedgerPath(flag: string | undefined, startDir: string): string {
  const resolved = resolveLedger(flag, startDir);
  if (resolved.source.kind === "none") throw new RepoConfigError(NO_LEDGER_MESSAGE);
  return resolved.path;
}

export const NO_LEDGER_MESSAGE =
  "no ledger configured — run `ndr init` in the repo, or pass --ledger";
