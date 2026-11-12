# Daisy migration inventory

The inspected working tree is a shared Kotlin/Java Fabric client built for 13
Minecraft versions by Stonecutter, an independent bootstrap agent, and an
Electron/React launcher. Its architecture was preserved. Client sources already
use `dev.daisy`; no artificial Java launcher or duplicate Gradle module was added.

## Repeatable evidence

```sh
python scripts/audit-branding.py --show-allowed --report build/reports/branding.json
python scripts/verify-project.py
```

The JSON inventory lists every discovered reference, source line, exact text,
status and recommended action. Filename matches use line zero. The audit scans
working-tree UTF-8 text, filenames and PNG textual metadata, including untracked
files; it prunes Git internals, dependency caches, generated sources and builds.
It does not read commit history. It does not decode pixels, audio or font glyphs.
Font provenance is retained through the original text notices. A successful audit
cannot establish image ownership or certify all arbitrary binary formats.

Exceptions are exact lines with occurrence limits, or SHA-256 snapshots of
unchanged historical and third-party notices. New text is not covered by a whole
source-file exclusion. Negative tests verify that new references fail and that
filenames, source locations and dependency pruning work. Obsolete exception
records were pruned against the current files.

## Retained interfaces

Existing stored configuration names, global datapack directories, exported
instance formats, social/preload aliases, JVM properties, pack/resource IDs and
wire messages retain their compatibility spellings. The neutral Fabric mod ID
`clientcore` also remains stable. They must only change with coordinated readers,
resource overrides and data migrations. Known old JAR patterns remain as cleanup
rules so upgrades do not leave duplicate mods behind.

External service URLs and OAuth/protocol IDs are retained when no replacement
service or credentials are present. These are dependencies to provision and test,
not strings to replace with invented Daisy domains. The exact inventory and
allowlist explain each occurrence. Historical launcher release records are pinned
and preserved rather than being presented as new Daisy release history.

## Changes in this pass

- Fixed the stale license audit snapshot and added a negative namespace packaging
  exception. The indexed and working-tree root licenses were already MIT; no
  original source license was reconstructed from Git history.
- Added project verification and clean-build scripts and audit JSON output.
- Validated Java/Kotlin package paths, Fabric icons, mixins, entrypoints, target
  properties, version coordination and npm metadata.
- Set launcher product and maintainer metadata; included root and third-party
  notices and npm dependency license texts in packaging inputs.
- Made client/agent archive ordering and timestamps deterministic and added the
  official Gradle distribution checksum.
- Corrected CI/main/manual triggers, made CI package the built clients with the
  launcher, and restricted automated releases to version tags or manual dispatch.
- Updated workflows to documented action generations with checkout credential
  persistence disabled, clean client builds, separate artifact uploads, release
  collision failures and changelog-based notes.
- Added contribution/changelog/notice documents and corrected stale README paths
  and updater descriptions. Existing working-tree deletions and migration work
  were preserved; no additional source module was deleted in this pass.

## Open source license status

Daisy Client is fully open source under the MIT License (`LICENSE`). All Fabric metadata
declares the project under `MIT`. Release artifacts and launcher packaging include the
MIT License and open source dependency notices.
