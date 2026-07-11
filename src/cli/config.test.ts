import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  CONFIG_BASENAME,
  RepoConfigError,
  findRepoConfig,
  parseRepoConfig,
  resolveLedger,
  resolveLedgerPath,
} from "./config.ts";

let tmp: string;
beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ndr-config-"));
});
afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

async function writeConfig(dir: string, content: string): Promise<string> {
  const configPath = path.join(dir, CONFIG_BASENAME);
  await fs.writeFile(configPath, content, "utf8");
  return configPath;
}

describe("parseRepoConfig", () => {
  test("absolute ledger and project pass through", () => {
    const config = parseRepoConfig(
      path.join(tmp, CONFIG_BASENAME),
      'ledger = "/somewhere/decisions"\nproject = "[[ndr]]"\n',
    );
    expect(config.ledger).toBe("/somewhere/decisions");
    expect(config.project).toBe("[[ndr]]");
  });

  test("relative ledger resolves against the config file's directory", () => {
    const config = parseRepoConfig(
      path.join(tmp, CONFIG_BASENAME),
      'ledger = "./decisions"\nproject = "p"\n',
    );
    expect(config.ledger).toBe(path.join(tmp, "decisions"));
  });

  test("a leading ~/ expands to the home directory", () => {
    const config = parseRepoConfig(
      path.join(tmp, CONFIG_BASENAME),
      'ledger = "~/Loose Ends/Decisions"\nproject = "p"\n',
    );
    expect(config.ledger).toBe(path.join(os.homedir(), "Loose Ends", "Decisions"));
  });

  test("missing project key throws RepoConfigError (mirrors the atom schema, ndr:0130)", () => {
    expect(() =>
      parseRepoConfig(path.join(tmp, CONFIG_BASENAME), 'ledger = "./decisions"\n'),
    ).toThrow(RepoConfigError);
  });

  test("empty project string throws RepoConfigError", () => {
    expect(() =>
      parseRepoConfig(path.join(tmp, CONFIG_BASENAME), 'ledger = "./decisions"\nproject = ""\n'),
    ).toThrow(RepoConfigError);
  });

  test("missing ledger key throws RepoConfigError", () => {
    expect(() => parseRepoConfig(path.join(tmp, CONFIG_BASENAME), 'project = "[[x]]"\n')).toThrow(
      RepoConfigError,
    );
  });

  test("non-string ledger throws RepoConfigError", () => {
    expect(() => parseRepoConfig(path.join(tmp, CONFIG_BASENAME), "ledger = 42\n")).toThrow(
      RepoConfigError,
    );
  });

  test("invalid TOML throws RepoConfigError naming the file", () => {
    expect(() => parseRepoConfig(path.join(tmp, CONFIG_BASENAME), "ledger = [unclosed\n")).toThrow(
      RepoConfigError,
    );
  });
});

describe("findRepoConfig", () => {
  test("finds .ndr.toml in the start directory", async () => {
    await writeConfig(tmp, 'ledger = "./decisions"\nproject = "p"\n');
    const config = findRepoConfig(tmp);
    expect(config?.ledger).toBe(path.join(tmp, "decisions"));
  });

  test("walks up from a nested directory to the repo root", async () => {
    await writeConfig(tmp, 'ledger = "./decisions"\nproject = "p"\n');
    const nested = path.join(tmp, "src", "deep", "deeper");
    await fs.mkdir(nested, { recursive: true });
    const config = findRepoConfig(nested);
    expect(config?.ledger).toBe(path.join(tmp, "decisions"));
    expect(config?.configPath).toBe(path.join(tmp, CONFIG_BASENAME));
  });

  test("the nearest config wins when ancestors also carry one", async () => {
    await writeConfig(tmp, 'ledger = "./outer"\nproject = "p"\n');
    const inner = path.join(tmp, "subrepo");
    await fs.mkdir(inner);
    await writeConfig(inner, 'ledger = "./inner"\nproject = "p"\n');
    const config = findRepoConfig(inner);
    expect(config?.ledger).toBe(path.join(inner, "inner"));
  });

  test("returns undefined when no config exists up to the root", async () => {
    const nested = path.join(tmp, "no-config-here");
    await fs.mkdir(nested);
    expect(findRepoConfig(nested)).toBeUndefined();
  });
});

describe("resolveLedgerPath", () => {
  test("the --ledger flag wins over a present .ndr.toml", async () => {
    await writeConfig(tmp, 'ledger = "./decisions"\nproject = "p"\n');
    expect(resolveLedgerPath("/flag/wins", tmp)).toBe("/flag/wins");
  });

  test("a .ndr.toml resolves when no flag is passed", async () => {
    await writeConfig(tmp, 'ledger = "./decisions"\nproject = "p"\n');
    expect(resolveLedgerPath(undefined, tmp)).toBe(path.join(tmp, "decisions"));
  });

  test("errors pointing at `ndr init` when neither flag nor config exists", () => {
    expect(() => resolveLedgerPath(undefined, tmp)).toThrow(RepoConfigError);
    expect(() => resolveLedgerPath(undefined, tmp)).toThrow(/ndr init/);
  });

  test("a broken .ndr.toml fails loudly instead of falling back", async () => {
    await writeConfig(tmp, "ledger = [unclosed\n");
    expect(() => resolveLedgerPath(undefined, tmp)).toThrow(RepoConfigError);
  });
});

describe("NDR_LEDGER env in resolution", () => {
  const saved = process.env.NDR_LEDGER;
  afterEach(() => {
    if (saved === undefined) delete process.env.NDR_LEDGER;
    else process.env.NDR_LEDGER = saved;
  });

  test("env overrides a present .ndr.toml", async () => {
    await writeConfig(tmp, 'ledger = "./decisions"\nproject = "p"\n');
    process.env.NDR_LEDGER = "/env/wins";
    expect(resolveLedgerPath(undefined, tmp)).toBe("/env/wins");
    expect(resolveLedger(undefined, tmp)).toEqual({ path: "/env/wins", source: { kind: "env" } });
  });

  test("the --ledger flag still beats the env var", async () => {
    process.env.NDR_LEDGER = "/env/loses";
    expect(resolveLedgerPath("/flag/wins", tmp)).toBe("/flag/wins");
    expect(resolveLedger("/flag/wins", tmp).source).toEqual({ kind: "flag" });
  });

  test("resolveLedger reports the config source and `none` without throwing", async () => {
    delete process.env.NDR_LEDGER;
    const cfg = await writeConfig(tmp, 'ledger = "./decisions"\nproject = "p"\n');
    expect(resolveLedger(undefined, tmp)).toEqual({
      path: path.join(tmp, "decisions"),
      source: { kind: "config", configPath: cfg },
    });
    // A fresh top-level temp dir (not nested under tmp, which now carries a
    // config the walk-up would find).
    const empty = await fs.mkdtemp(path.join(os.tmpdir(), "ndr-noconfig-"));
    try {
      expect(resolveLedger(undefined, empty).source).toEqual({ kind: "none" });
    } finally {
      await fs.rm(empty, { recursive: true, force: true });
    }
  });
});
