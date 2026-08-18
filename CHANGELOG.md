# Changelog

## [1.0.0](https://github.com/jdh313/ndr/compare/ndr-v0.1.0...ndr-v1.0.0) (2026-08-18)


### ⚠ BREAKING CHANGES

* **plugin:** the Claude marketplace root moves from the repo root to marketplaces/claude. Re-add with:   /plugin marketplace remove ndr   /plugin marketplace add ~/Projects/ndr/marketplaces/claude
* init seeds labels.yaml and plain project names; rule prose on two grains
* two-grain resolve, label-aware briefs and current, ndr labels command
* doctor checks labels, stale binds, and context sections; alias checks removed
* new-format capture with plain-id supersession and advisories
* single labels.yaml taxonomy axis replaces areas/topics
* two-grain reference type, extractAtomIdFromRef accepts plain ids
* new-format frontmatter schema (author, conviction, labels, binds)

### Features

* capture auto-fills author from git and prints advisories ([42333f7](https://github.com/jdh313/ndr/commit/42333f7341ad7f10640a29b9aede8eb0171576b1))
* **capture:** accept a markdown draft file, not only JSON ([e11e56e](https://github.com/jdh313/ndr/commit/e11e56e535f3c91f8908927ca69c6aff4174ead7))
* **config:** require the project key in .ndr.toml ([3332670](https://github.com/jdh313/ndr/commit/3332670dfd1c30396a565297d20526953494ed06))
* doctor checks labels, stale binds, and context sections; alias checks removed ([515cd0a](https://github.com/jdh313/ndr/commit/515cd0a447d8a6d29e757f1ceac858d928aa1f88))
* doctor gathers repo files for binds checks via git ls-files ([1982f8e](https://github.com/jdh313/ndr/commit/1982f8e67878337a17858719bab985fad46fb0e3))
* init seeds labels.yaml and plain project names; rule prose on two grains ([db0ba99](https://github.com/jdh313/ndr/commit/db0ba994aa76e556040a2d320039715e53f0ac68))
* **migrate:** carry dropped fields into body + add --apply-bodies ([6ec51df](https://github.com/jdh313/ndr/commit/6ec51dfc463c83ae87764112422f62aa1c54d4ef))
* ndr migrate — mechanical pass-1 format migration ([94b5465](https://github.com/jdh313/ndr/commit/94b54659a33fca1e1217cc369809fbd762f26c93))
* new-format capture with plain-id supersession and advisories ([47b0d40](https://github.com/jdh313/ndr/commit/47b0d402d57469962bb7904b37b05407a620b5df))
* new-format frontmatter schema (author, conviction, labels, binds) ([22035b9](https://github.com/jdh313/ndr/commit/22035b912476987f70ef2b31c05bbcee97a6d234))
* **plugin:** add a session-start hook that flags an outdated ndr CLI ([c4cf031](https://github.com/jdh313/ndr/commit/c4cf031b3aa9aab06cef639a9c5f06d51f7aad91))
* **plugin:** generate manifests from AgentForge canonical definitions ([bed4e16](https://github.com/jdh313/ndr/commit/bed4e16ef4b34259020104e7499f9a3f2aee7d1b))
* retirable migrate-ledger skill and ndr-migrator agent for pass-2 reshaping ([cc4f0c8](https://github.com/jdh313/ndr/commit/cc4f0c8d17c63825c89f18269ed6fae32e2d1c02))
* single labels.yaml taxonomy axis replaces areas/topics ([df57292](https://github.com/jdh313/ndr/commit/df5729270826dc74f3ab03405282e6f245e9bb65))
* two-grain resolve, label-aware briefs and current, ndr labels command ([b36c093](https://github.com/jdh313/ndr/commit/b36c09341ff28a90659cda718a910f7710572368))


### Bug Fixes

* **cli:** accept the documented `ndr:` prefix on resolve, show, and lineage ([cb82c18](https://github.com/jdh313/ndr/commit/cb82c1885be50280fec6adac04206951939306eb))
* ndr migrate reports label truncation and covers error paths ([7d202ce](https://github.com/jdh313/ndr/commit/7d202ce4a87a070e95226a940852f9d2a4dfb02f))
* **plugin:** quote frontmatter descriptions containing ": " ([4d5e3b1](https://github.com/jdh313/ndr/commit/4d5e3b13401ac83d2650296a053f248977f29fa9))
* **schema:** reject wikilink project values at capture and in config ([c200f9f](https://github.com/jdh313/ndr/commit/c200f9f2fdde34780085417c124d8ee2dc4ff4e2))


### Code Refactoring

* two-grain reference type, extractAtomIdFromRef accepts plain ids ([7b4b0fb](https://github.com/jdh313/ndr/commit/7b4b0fb7c77aa54d75616072fb360bf68ab4133f))

## 0.1.0 (2026-07-08)


### Features

* automate ndr releases via release-please and a native build matrix ([d6d6329](https://github.com/jdh313/ndr/commit/d6d6329c66c7a168f045838701e035baa2992f76))
* creates new skill for interrogating ndr decisions ([c899099](https://github.com/jdh313/ndr/commit/c899099061833297dbe63592e47ac47c1f256727))


### Bug Fixes

* pin the first ndr release to 0.1.0 via config-file mode ([e840842](https://github.com/jdh313/ndr/commit/e84084220daac7236dabdcb220b4e0780c50fd6a))
* stop ndr-drafter emitting a bogus id and title-inline H1 ([816d783](https://github.com/jdh313/ndr/commit/816d783fe133b8bdb4bbc08dc806139e5e227662))
