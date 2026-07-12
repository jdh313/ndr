import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import YAML from "yaml";

const repoRoot = resolve(import.meta.dir, "..");
const marketplacePath = resolve(repoRoot, ".agents/plugins/marketplace.json");
const claudeMarketplacePath = resolve(repoRoot, ".claude-plugin/marketplace.json");
const semver =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

type Json = Record<string, unknown>;

const errors: string[] = [];

function object(value: unknown, path: string): Json | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    errors.push(`${path} must be an object`);
    return undefined;
  }
  return value as Json;
}

function string(value: unknown, path: string): string | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${path} must be a non-empty string`);
    return undefined;
  }
  return value;
}

function stringArray(value: unknown, path: string): void {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => typeof item !== "string" || item.trim() === "")
  ) {
    errors.push(`${path} must be a non-empty string array`);
  }
}

async function json(path: string): Promise<Json | undefined> {
  try {
    return object(await Bun.file(path).json(), path);
  } catch (error) {
    errors.push(
      `${path} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

const marketplace = await json(marketplacePath);
const claudeMarketplace = await json(claudeMarketplacePath);

if (marketplace) {
  string(marketplace.name, "Codex marketplace.name");
  const interfaceValue = object(marketplace.interface, "Codex marketplace.interface");
  if (interfaceValue) string(interfaceValue.displayName, "Codex marketplace.interface.displayName");
  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
    errors.push("Codex marketplace.plugins must be a non-empty array");
  } else {
    const names = new Set<string>();
    for (const [index, item] of marketplace.plugins.entries()) {
      const entry = object(item, `Codex marketplace.plugins[${index}]`);
      if (!entry) continue;
      const name = string(entry.name, `Codex marketplace.plugins[${index}].name`);
      if (name && names.has(name)) errors.push(`Codex marketplace has duplicate plugin ${name}`);
      if (name) names.add(name);
      string(entry.category, `Codex marketplace.plugins[${index}].category`);
      const source = object(entry.source, `Codex marketplace.plugins[${index}].source`);
      const sourcePath =
        source && string(source.path, `Codex marketplace.plugins[${index}].source.path`);
      if (source?.source !== "local")
        errors.push(`Codex marketplace.plugins[${index}].source.source must be local`);
      if (!sourcePath?.startsWith("./"))
        errors.push(`Codex marketplace.plugins[${index}].source.path must start with ./`);
      const pluginRoot = sourcePath && resolve(repoRoot, sourcePath);
      if (pluginRoot && !pluginRoot.startsWith(`${repoRoot}/plugins/`))
        errors.push(`Codex marketplace.plugins[${index}] source escapes plugins/`);
      const policy = object(entry.policy, `Codex marketplace.plugins[${index}].policy`);
      if (
        policy &&
        !["NOT_AVAILABLE", "AVAILABLE", "INSTALLED_BY_DEFAULT"].includes(
          policy.installation as string,
        )
      )
        errors.push(`Codex marketplace.plugins[${index}].policy.installation is invalid`);
      if (policy && !["ON_INSTALL", "ON_USE"].includes(policy.authentication as string))
        errors.push(`Codex marketplace.plugins[${index}].policy.authentication is invalid`);
      if (!pluginRoot || !name) continue;

      const codexManifest = await json(resolve(pluginRoot, ".codex-plugin/plugin.json"));
      const claudeManifest = await json(resolve(pluginRoot, ".claude-plugin/plugin.json"));
      if (!codexManifest || !claudeManifest) continue;
      const manifestName = string(codexManifest.name, `${name} Codex manifest.name`);
      const version = string(codexManifest.version, `${name} Codex manifest.version`);
      string(codexManifest.description, `${name} Codex manifest.description`);
      if (manifestName !== name) errors.push(`${name} marketplace and Codex manifest names differ`);
      if (version && !semver.test(version))
        errors.push(`${name} Codex manifest.version must be strict semver`);
      if (
        codexManifest.name !== claudeManifest.name ||
        codexManifest.version !== claudeManifest.version
      )
        errors.push(`${name} Claude and Codex manifest name/version parity failed`);
      const author = object(codexManifest.author, `${name} Codex manifest.author`);
      if (author) string(author.name, `${name} Codex manifest.author.name`);
      const manifestInterface = object(codexManifest.interface, `${name} Codex manifest.interface`);
      if (manifestInterface) {
        for (const field of [
          "displayName",
          "shortDescription",
          "longDescription",
          "developerName",
          "category",
        ])
          string(manifestInterface[field], `${name} Codex manifest.interface.${field}`);
        stringArray(
          manifestInterface.capabilities,
          `${name} Codex manifest.interface.capabilities`,
        );
        stringArray(
          manifestInterface.defaultPrompt,
          `${name} Codex manifest.interface.defaultPrompt`,
        );
      }
      const skillsDir = resolve(pluginRoot, "skills");
      for (const skill of await readdir(skillsDir, { withFileTypes: true })) {
        if (!skill.isDirectory()) continue;
        const skillPath = resolve(skillsDir, skill.name, "SKILL.md");
        const contents = await Bun.file(skillPath).text();
        const match = contents.match(/^---\n([\s\S]*?)\n---\n/);
        if (!match) {
          errors.push(`${skillPath} has no YAML frontmatter`);
          continue;
        }
        try {
          const frontmatter = object(YAML.parse(match[1]), `${skillPath} frontmatter`);
          if (frontmatter) {
            string(frontmatter.name, `${skillPath} frontmatter.name`);
            string(frontmatter.description, `${skillPath} frontmatter.description`);
          }
        } catch (error) {
          errors.push(
            `${skillPath} has invalid YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }
  }
}

if (claudeMarketplace && Array.isArray(claudeMarketplace.plugins)) {
  const ndrEntries = claudeMarketplace.plugins.filter(
    (entry) => object(entry, "Claude marketplace plugin")?.name === "ndr",
  );
  if (ndrEntries.length !== 1)
    errors.push(
      "Claude marketplace must discover ndr exactly once; Codex manifest must not create a duplicate entry",
    );
}

if (errors.length > 0) {
  console.error("Codex plugin validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Codex marketplace, manifest parity, and skill frontmatter validation passed.");
