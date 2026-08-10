# Changelog

## [1.0.0-beta.1](https://github.com/jdh313/ndr/compare/ndr-v1.0.0-beta...ndr-v1.0.0-beta.1) (2026-08-10)


### ⚠ BREAKING CHANGES

* **plugin:** the Claude marketplace root moves from the repo root to marketplaces/claude. Re-add with:   /plugin marketplace remove ndr   /plugin marketplace add ~/Projects/ndr/marketplaces/claude

### Features

* **config:** require the project key in .ndr.toml ([00fc623](https://github.com/jdh313/ndr/commit/00fc6233f23faff6b4a6aa95ea3c3d962c0da0e0))
* **plugin:** generate manifests from AgentForge canonical definitions ([07fbb6a](https://github.com/jdh313/ndr/commit/07fbb6a0daeb9d241938cae3bb8ef113b4d1cae1))


### Bug Fixes

* **cli:** accept the documented `ndr:` prefix on resolve, show, and lineage ([49feb78](https://github.com/jdh313/ndr/commit/49feb785b81007df88211e8ba2156d9da9e46ce7))
* **plugin:** quote frontmatter descriptions containing ": " ([60e4cab](https://github.com/jdh313/ndr/commit/60e4cabc386116c0bc486b520bb2e002fb713a2f))
* **schema:** reject wikilink project values at capture and in config ([a861153](https://github.com/jdh313/ndr/commit/a8611535190afbd516f9b29f1ed23e14ab979ea3))

## [1.0.0-beta](https://github.com/jdh313/ndr/compare/ndr-v0.1.0...ndr-v1.0.0-beta) (2026-07-10)


### ⚠ BREAKING CHANGES

* init seeds labels.yaml and plain project names; rule prose on two grains
* two-grain resolve, label-aware briefs and current, ndr labels command
* doctor checks labels, stale binds, and context sections; alias checks removed
* new-format capture with plain-id supersession and advisories
* single labels.yaml taxonomy axis replaces areas/topics
* two-grain reference type, extractAtomIdFromRef accepts plain ids
* new-format frontmatter schema (author, conviction, labels, binds)

### Features

* capture auto-fills author from git and prints advisories ([5dedbc1](https://github.com/jdh313/ndr/commit/5dedbc137942b4d4d8eefc12e7d9d4e5c884e11f))
* **capture:** accept a markdown draft file, not only JSON ([c60dd19](https://github.com/jdh313/ndr/commit/c60dd190b81f32843a267840de939e473b6ba879))
* doctor checks labels, stale binds, and context sections; alias checks removed ([5d62cf0](https://github.com/jdh313/ndr/commit/5d62cf0b15d87c4963584c3e0cb12e2eca1879b2))
* doctor gathers repo files for binds checks via git ls-files ([24fa035](https://github.com/jdh313/ndr/commit/24fa035a25c3cf0a3c0899344824770a23de7cd6))
* init seeds labels.yaml and plain project names; rule prose on two grains ([11dc4a8](https://github.com/jdh313/ndr/commit/11dc4a84a53c0b72fbcf1860fa6aceb8bf12933e))
* **migrate:** carry dropped fields into body + add --apply-bodies ([059fd03](https://github.com/jdh313/ndr/commit/059fd03687bb03d62dc190bff3a50ad00aefd1f3))
* ndr migrate — mechanical pass-1 format migration ([36d2b1c](https://github.com/jdh313/ndr/commit/36d2b1c597640e276b9f5d36921d79002575f3de))
* new-format capture with plain-id supersession and advisories ([7e471b8](https://github.com/jdh313/ndr/commit/7e471b8adfda699294c5477c077871a98aff8d3e))
* new-format frontmatter schema (author, conviction, labels, binds) ([3db5b3f](https://github.com/jdh313/ndr/commit/3db5b3f6bf3934e5bc107f908bb3594089a0b792))
* **plugin:** add a session-start hook that flags an outdated ndr CLI ([09b2a5c](https://github.com/jdh313/ndr/commit/09b2a5cf72d73550488f9d5ec6e70cf63896e5d8))
* retirable migrate-ledger skill and ndr-migrator agent for pass-2 reshaping ([6b295d9](https://github.com/jdh313/ndr/commit/6b295d9f5810464325ddfd528b087d62687436a6))
* single labels.yaml taxonomy axis replaces areas/topics ([7ce2ac3](https://github.com/jdh313/ndr/commit/7ce2ac38451b99993f93fe302f1c501ba662a078))
* two-grain resolve, label-aware briefs and current, ndr labels command ([51afab5](https://github.com/jdh313/ndr/commit/51afab56ddc666c392521614af0bb7ca61ce09b6))


### Bug Fixes

* ndr migrate reports label truncation and covers error paths ([b0167af](https://github.com/jdh313/ndr/commit/b0167aff53eddd0bf494585090ce18cdcba687ce))


### Code Refactoring

* two-grain reference type, extractAtomIdFromRef accepts plain ids ([d46e938](https://github.com/jdh313/ndr/commit/d46e938df3831b36c6dc1febea743227fc7002ec))
