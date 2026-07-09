import type { AtomDraft } from "../domain/atom.ts";

// Shared new-format (Task 1 schema) draft builder. Originated in
// adapters/markdown/adapter.test.ts (Task 4); pulled out here so the CLI
// capture tests (Task 5) build the same draft shape without importing across
// test files.
export function draftFor(overrides: Record<string, unknown> = {}): AtomDraft {
  const title = (overrides.title as string) ?? "t";
  return {
    frontmatter: {
      title,
      status: "current",
      decision_date: "2026-07-08",
      author: "Jacob Hoehler",
      conviction: "tentative",
      project: "ndr",
      labels: ["write-side"],
      supersedes: [],
      ...overrides,
    },
    body: `\n# PLACEHOLDER — ${title}\n\n## Decision\n\nOne sentence.\n\n## Context\n\n- A fact.\n\n## Why\n\nBecause.\n`,
  } as unknown as AtomDraft;
}
