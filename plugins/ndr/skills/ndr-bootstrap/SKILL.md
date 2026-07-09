---
name: ndr-bootstrap
description: One-time install of ndr's vault content. Copies the seed decision atoms (A–H meta-chain at 0001-0008 plus reference-addressability resolution at 0049-0051) and the initial `labels.yaml` taxonomy file into `~/Loose Ends/`. Idempotent — re-runs skip targets that already exist. Invoke explicitly with `/ndr-bootstrap` once per machine after installing the ndr plugin.
disable-model-invocation: true
allowed-tools:
  - Bash
---

# ndr-bootstrap

## Overview

Install ndr's vault-resident content on a fresh machine. Three things land:

1. **Seed decision atoms** (`assets/decisions/*.md` — 0001-0008 A-H meta-chain plus 0049-0051 reference-addressability resolution) → `~/Loose Ends/Decisions/`
2. **Taxonomy YAML** (`assets/taxonomy/labels.yaml`) → `~/Loose Ends/Decisions/.taxonomy/`
3. **Project grounding-rule template** (`assets/project-snippet/project-claude-md.md`) → `~/Loose Ends/Decisions/.templates/project-claude-md.md` — a manual-merge fallback. The normal opt-in is `ndr init`, which writes `.claude/rules/ndr.md` directly; this template is for hand-merging into an existing `CLAUDE.md`.

Each file is copied **only if the target is absent**. Re-runs do nothing destructive — they print `skipped (exists): <path>` for any target already present.

This skill is `disable-model-invocation: true` — it only fires when the user types `/ndr-bootstrap` explicitly. Claude won't auto-invoke it.

## When to invoke

- Right after installing the ndr plugin on a new machine.
- Anytime you want to verify vault content is in place (idempotent — safe to re-run).

## When NOT to invoke

- If the vault already has decisions and you don't want any seed atoms added: pass `--no-seed` (TBD; for MVP, just don't run bootstrap, or remove the assets first).
- If you've changed the canonical taxonomy in the vault and don't want the plugin's defaults to apply: don't re-run. (First run installs initial values; subsequent edits stay in the vault.)

## Method

Run the following Bash block. Every operation is idempotent (`[ -e target ]` checks before any write, `mkdir -p` is always safe).

```bash
set -e

PLUGIN_ASSETS="${CLAUDE_PLUGIN_ROOT}/assets"
VAULT_DECISIONS="$HOME/Loose Ends/Decisions"
VAULT_TAXONOMY="$VAULT_DECISIONS/.taxonomy"
VAULT_TEMPLATES="$VAULT_DECISIONS/.templates"

copied=0
skipped=0

# ensure directories
mkdir -p "$VAULT_DECISIONS" "$VAULT_TAXONOMY" "$VAULT_TEMPLATES"

# seed decisions
for src in "$PLUGIN_ASSETS"/decisions/*.md; do
  name=$(basename "$src")
  dst="$VAULT_DECISIONS/$name"
  if [ -e "$dst" ]; then
    echo "skipped (exists): Decisions/$name"
    skipped=$((skipped+1))
  else
    cp "$src" "$dst"
    echo "copied: Decisions/$name"
    copied=$((copied+1))
  fi
done

# taxonomy
labels_src="$PLUGIN_ASSETS/taxonomy/labels.yaml"
labels_dst="$VAULT_TAXONOMY/labels.yaml"
if [ -e "$labels_dst" ]; then
  echo "skipped (exists): Decisions/.taxonomy/labels.yaml"
  skipped=$((skipped+1))
else
  cp "$labels_src" "$labels_dst"
  echo "copied: Decisions/.taxonomy/labels.yaml"
  copied=$((copied+1))
fi

# project-CLAUDE.md template (for opting individual repos into the grounding rule)
snippet_dst="$VAULT_TEMPLATES/project-claude-md.md"
if [ -e "$snippet_dst" ]; then
  echo "skipped (exists): Decisions/.templates/project-claude-md.md"
  skipped=$((skipped+1))
else
  cp "$PLUGIN_ASSETS/project-snippet/project-claude-md.md" "$snippet_dst"
  echo "copied: Decisions/.templates/project-claude-md.md"
  copied=$((copied+1))
fi

echo ""
echo "bootstrap complete: $copied copied, $skipped skipped (already present)"
echo ""
echo "to opt a repo into NDR coverage: run \`ndr init\` at the repo root"
```

After the script finishes, report the counts to the user.

## Output examples

### Fresh machine (everything copied)

```
copied: Decisions/0001-substrate-team-product-cms.md
copied: Decisions/0002-mvp-scope-one-repo.md
copied: Decisions/0003-q1-method-discipline-experiment.md
copied: Decisions/0004-manual-discipline-wont-sustain.md
copied: Decisions/0005-mvp-substrate-graphiti.md
copied: Decisions/0006-readside-decisions-skill.md
copied: Decisions/0007-mvp-substrate-markdown.md
copied: Decisions/0008-decisions-atomic.md
copied: Decisions/0049-ndr-reference-scheme-three-grains.md
copied: Decisions/0050-slugs-as-aliases-minted-lazily.md
copied: Decisions/0051-supersession-with-slug-is-three-writes.md
copied: Decisions/.taxonomy/labels.yaml
copied: Decisions/.templates/project-claude-md.md

bootstrap complete: 13 copied, 0 skipped (already present)

to opt a repo into NDR coverage: run `ndr init` at the repo root
```

### Already bootstrapped (everything skipped)

```
skipped (exists): Decisions/0001-substrate-team-product-cms.md
... (etc.)

bootstrap complete: 0 copied, 13 skipped (already present)
```

## Notes

- The taxonomy lives in `~/Loose Ends/Decisions/.taxonomy/` (vault-resident, hidden from Obsidian's file browser by the dot prefix). The capture skill writes new values there; cross-machine sync rides on the user's existing vault sync.
- Seed atoms encode ndr's own decision history (the A–H meta-chain). They're useful as a working corpus from day one and as examples of the new atom body shape. Delete them if you'd rather start empty.
- This skill does NOT modify the dotfiles repo, `~/.claude/`, or anything outside `~/Loose Ends/`. The plugin install handles those.
