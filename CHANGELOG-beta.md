# Changelog

## [1.0.0-beta.1](https://github.com/jdh313/ndr/compare/ndr-v1.0.0-beta...ndr-v1.0.0-beta.1) (2026-08-19)


### ⚠ BREAKING CHANGES

* **plugin:** the Claude marketplace root moves from the repo root to marketplaces/claude. Re-add with:   /plugin marketplace remove ndr   /plugin marketplace add ~/Projects/ndr/marketplaces/claude

### Features

* **config:** require the project key in .ndr.toml ([3332670](https://github.com/jdh313/ndr/commit/3332670dfd1c30396a565297d20526953494ed06))
* **plugin:** generate manifests from AgentForge canonical definitions ([bed4e16](https://github.com/jdh313/ndr/commit/bed4e16ef4b34259020104e7499f9a3f2aee7d1b))


### Bug Fixes

* **cli:** accept the documented `ndr:` prefix on resolve, show, and lineage ([cb82c18](https://github.com/jdh313/ndr/commit/cb82c1885be50280fec6adac04206951939306eb))
* **plugin:** quote frontmatter descriptions containing ": " ([4d5e3b1](https://github.com/jdh313/ndr/commit/4d5e3b13401ac83d2650296a053f248977f29fa9))
* **schema:** reject wikilink project values at capture and in config ([c200f9f](https://github.com/jdh313/ndr/commit/c200f9f2fdde34780085417c124d8ee2dc4ff4e2))

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

* capture auto-fills author from git and prints advisories ([b7f19c2](https://github.com/jdh313/ndr/commit/b7f19c26ebd3651dd324f9f3cd9832312c147943))
* **capture:** accept a markdown draft file, not only JSON ([6789ec5](https://github.com/jdh313/ndr/commit/6789ec5baa8818aceeec7234cec871761097990d))
* doctor checks labels, stale binds, and context sections; alias checks removed ([b8aa672](https://github.com/jdh313/ndr/commit/b8aa672f1fc3e810268d8129d27c5488ba8ce600))
* doctor gathers repo files for binds checks via git ls-files ([71996ae](https://github.com/jdh313/ndr/commit/71996ae1b16243f4cede28b99e00a5b01a1813ac))
* init seeds labels.yaml and plain project names; rule prose on two grains ([657c61a](https://github.com/jdh313/ndr/commit/657c61a365ab982cc5473a9f4aaa53d834388bb4))
* **migrate:** carry dropped fields into body + add --apply-bodies ([c6556ba](https://github.com/jdh313/ndr/commit/c6556baf047c27d169745f3bc961b7edb18ed79e))
* ndr migrate — mechanical pass-1 format migration ([e68ed89](https://github.com/jdh313/ndr/commit/e68ed89deae72a0ec6a434deb0604685d1baccad))
* new-format capture with plain-id supersession and advisories ([78fb044](https://github.com/jdh313/ndr/commit/78fb0445429899a18c9419480f24c5ac755b665f))
* new-format frontmatter schema (author, conviction, labels, binds) ([8ae619e](https://github.com/jdh313/ndr/commit/8ae619e97f1bbdadc7c88891bf2cffb791740886))
* **plugin:** add a session-start hook that flags an outdated ndr CLI ([731a953](https://github.com/jdh313/ndr/commit/731a95333478562c3703e110007d245d6851db07))
* retirable migrate-ledger skill and ndr-migrator agent for pass-2 reshaping ([7f0d258](https://github.com/jdh313/ndr/commit/7f0d2583caa746ca62c86ba3581b3da5a33f687b))
* single labels.yaml taxonomy axis replaces areas/topics ([d0fbd66](https://github.com/jdh313/ndr/commit/d0fbd6643764e63fb128ff4bbb567699df8784aa))
* two-grain resolve, label-aware briefs and current, ndr labels command ([ce3c842](https://github.com/jdh313/ndr/commit/ce3c842dbc0069f1c49bc69ee7242cb63665a605))


### Bug Fixes

* ndr migrate reports label truncation and covers error paths ([28ac2bd](https://github.com/jdh313/ndr/commit/28ac2bdc831f290fb8963d0ef0d136ef5991e0b0))


### Code Refactoring

* two-grain reference type, extractAtomIdFromRef accepts plain ids ([dce66f6](https://github.com/jdh313/ndr/commit/dce66f6105306d2a32276cc45c414eeb46e54d0d))
