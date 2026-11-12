# Daisy branding audit

The working tree retains the Fabric client under `src/client`, all 13 configured
Stonecutter targets, the independent `legacy/` build, the renamed
`daisy-bootstrap/` component and the Electron launcher. No launcher JAR or artificial
Gradle modules were introduced. The bootstrap is retained for the launcher agent
fallback. The independent legacy initializer has no verified reason for removal.

Run `python scripts/audit-branding.py --show-allowed` for every retained reference,
including file, line and justification. Exact-line exceptions with occurrence limits
live in `scripts/branding-allowlist.json`; legal/historical files are pinned by hash.

Remaining identifiers are preserved for these reasons:

- Original license, copyright and third-party notices preserve attribution.
  Historical release records preserve the actual upstream release history.
- Stored settings, instance/archive fields, session files, migration aliases and
  `.rvr` exports preserve existing installations and serialized data.
- Minecraft mod/resource namespaces, pack identifiers and legacy mixin filenames
  preserve saved selections, resource overrides and loader compatibility.
- JVM properties, environment aliases, IPC aliases, network headers and social
  protocol fields preserve launch configurations and external consumers.
- Existing backend endpoints, management buckets and certificate identities remain
  external dependencies. Ownership, availability and replacement services are not
  established by this rebrand. Publishing requires explicitly configured
  infrastructure; a new name cannot create a new signing identity.
- Original package patterns in crash recognition and old artifact cleanup rules
  recognize older logs and installations.
- Scanner vocabulary, landscape wording and demo lyrics are unrelated to branding.

Project-owned packages, build artifacts, entrypoints, launcher presentation and
client release URLs use Daisy names. The checked-in update manifest contains no
unverified artifact links or reused upstream checksums.

## License blocker

`LICENSE` remains the original source-available license. No ownership transfer or
written modification, redistribution or relicensing authorization was found in the
working tree. This report does not grant MIT rights. Preserve the original license
and attribution; obtain written rights-holder permission before distribution.
Release packaging/publication requires `DAISY_DISTRIBUTION_AUTHORIZED=true`;
set it only with documented authorization. See [validation.md](validation.md) for
local verification and its runtime, platform and workflow limits.
