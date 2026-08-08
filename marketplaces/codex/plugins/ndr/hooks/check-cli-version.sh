#!/usr/bin/env bash
# SessionStart hook (ndr:sd11d8): offline check that the installed ndr CLI is
# at least the version this plugin ships with (versions are lockstep from
# 1.0.0, ndr:nbyhyp). Fail-silent: every abnormal path exits 0 with no output.
set -u

plugin_json="${CLAUDE_PLUGIN_ROOT:-}/.claude-plugin/plugin.json"
[ -r "$plugin_json" ] || exit 0

required=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$plugin_json" | head -1)
[ -n "$required" ] || exit 0

install_cmd="bun install -g git+ssh://git@github.com/jdh313/ndr.git (or download a release binary)"

if ! command -v ndr >/dev/null 2>&1; then
  printf '{"systemMessage":"ndr plugin: the ndr CLI is not on PATH — its skills will fail. Install: %s"}\n' "$install_cmd"
  exit 0
fi

# Maintainer dev install (ndr:0147) is a symlink to a checkout's dist/ndr; a
# source build may legitimately lag the plugin version, so skip the nag there.
bin_path=$(command -v ndr)
target=$(readlink -f "$bin_path" 2>/dev/null || echo "$bin_path")
case "$target" in */dist/ndr) exit 0 ;; esac

installed=$(ndr --version 2>/dev/null) || exit 0
[ -n "$installed" ] || exit 0

if [ "$installed" != "$required" ] &&
  [ "$(printf '%s\n%s\n' "$installed" "$required" | sort -V | head -1)" = "$installed" ]; then
  msg="ndr plugin expects CLI >= ${required}, found ${installed}. Update: ${install_cmd}"
  printf '{"systemMessage":"%s","hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$msg" "$msg"
fi
exit 0
