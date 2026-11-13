# 1.0 beta foundation audit

Scope: `refactor/1.0-beta-foundation`, starting from `34075f7`. No history was reset,
no force-push was used, and no published release was removed. Per the maintainer's
clarification, the product uses local accounts only; Microsoft OAuth/ownership services
are not required. This report distinguishes recorded build evidence from runtime limits.

## Baseline before source changes

- `gradlew.bat build check --console=plain`: passed all 13 configured targets and bootstrap
  in 5m 48s, 180 tasks (143 executed, 37 up-to-date), using JDK 21 and cached JDK 25.
- Project verification, branding audit and 11 Python tests: passed.
- `npm ci`, 38 launcher tests and `npm run build:app`: passed.
- npm reported 23 dependency vulnerabilities: four moderate, 18 high and one critical.
- Existing Kotlin plugin/deprecation, accessor-cast and mixin-remapping warnings were
  recorded separately from failures. No baseline build task failed.
- No tracked build output was found other than the intentional Gradle wrapper JAR.

## Structure and retained behavior

The root shared `src/`, `versions/` and `daisy-bootstrap/` paths are retained. Moving them
into new cosmetic modules would disrupt Stonecutter source generation, package/resource
paths, artifact discovery and the release pipeline without improving the contributor path.
New architecture/build/contribution/release/troubleshooting guides explain the boundaries.

The Fabric entrypoint, module/HUD system, mixins, config fields, resource IDs, world and
instance data, local profiles/skin previews, optional network integrations, bootstrap
fallback, migration/RVR logic and exact-target client updates remain. Installed clients
stay disabled when explicitly disabled; updates preserve verified cached fallback.

Launcher startup no longer waits for network setup. Game/support installation remains in
create, repair and launch paths. Mojang/Fabric metadata can be reused offline, with an
explicit refresh when a newly selected Minecraft target is absent from the cached list.
Local names do not authenticate to protected multiplayer or Microsoft services. Standalone
client update notices use GitHub release metadata and never disable local modules.

## Removed files and evidence

References were searched in source, tests, npm scripts, Gradle, workflows, packaging and
documentation before removal. Audit/history mentions in this report are not runtime links.

| Removed file | Reason and replacement |
| --- | --- |
| `test.png` | Unreferenced root branding experiment; no runtime or packaging dependency. |
| `generate_daisy_textures.py` | One-off, Windows-font-dependent tool; replaced by portable `scripts/generate-assets.py` with source specifications and an OFL font. |
| `launcher/src/assets/partners/polaris-smp.png` | Unreferenced third-party partner artwork; current partner configuration is empty and no code names this file. |
| `src/main/resources/assets/clientcore/textures/watermark_logo.png` | Byte-identical duplicate resource; the same resource path remains in the client source set. |
| `launcher/src/bundled/skin/manifest.json` | Generated ready/checksum claims for external JARs without buildable source; runtime discovery does not use the file. Its old test was replaced with actual optional-discovery behavior tests. |
| `launcher/src/renderer-react/components/auth-dialog.jsx` | Unused Microsoft account flow for a local-account product; its import/render site and unused OAuth/ownership helpers were removed. |
| `docs/validation.md` | Stale snapshot claimed disabled updates, old test counts and unrelated local builds; replaced by this report and current task-focused guides. |

The generator is the only conceptual relocation; client/bootstrap modules and runtime asset
names were not renamed. Untracked `legacy/`, local artifacts, caches, logs and user files
were not deleted. Migration tests and compatibility identifiers were retained because
their readers are active. Optional Cloudflare operator scripts remain registered/documented;
their external infrastructure is not part of the GitHub release path.

## Assets, dependencies and licenses

- Root MIT terms and original source credits are preserved. Third-party material is not
  declared MIT merely because it is shipped with Daisy.
- 55 bitmap outputs now have original deterministic geometric source in
  `assets/artwork.json` / `scripts/generate-assets.py`. Their combined bytes decreased
  from 8,126,707 to 464,553. Unknown game screenshots, capes, seasonal images, proprietary
  font-rendered branding and brand-logo bitmaps were replaced while preserving resource
  paths/dimensions. The skin-viewer export now contains only an original six-bone idle rig.
- All 138 intentionally versioned binary assets have license/source/notice/hash records
  in `assets/licenses.json`. Font family/license metadata was inspected for all ten font
  files; full OFL terms and existing ISC/Feather notices are retained.
- Full Apache-2.0 and upstream Kotlin/JetBrains notices are included in `licenses/` and
  copied into client/agent metadata and launcher output. npm production notices continue
  to be collected from installed distributions. Electron/Chromium notices remain in native
  packages. No code-signing ownership is claimed for the compatibility public certificate.
- Official app bundles copy only coordinated, source-built client/agent JARs. Opaque
  optional skin/authentication-agent binaries from ignored local directories are excluded.
  Their local discovery code remains for independently reviewed developer inputs.
- The unused `skinview3d` dependency was removed; the actual viewer uses CSS/React.
  Electron is pinned to 45.3.1, electron-builder to 26.18.0, and the minimatch override
  to 11.0.8 is verified through native packaging. The final lockfile audit reports zero
  vulnerabilities, including production dependencies; it declares licenses for 605 packages.
- Fabric/Kotlin/Loom/Stonecutter and independent optimization mods are documented under
  their own terms. Sodium/PolyForm and LGPL dependencies are explicitly distinguished
  from MIT/permissive licenses. See `THIRD_PARTY_NOTICES.md` and the dependency records.

License validation checks recorded metadata, notices and hashes. It does not assert legal
ownership of external services or substitute for upstream license terms.

## CI, versioning and release verification

Versions are synchronized to `1.0.0-beta.2` across client, bootstrap, Electron, build and
release metadata. Shared version rules preserve older numeric versions and order beta/rc
versions correctly. Stable update discovery does not opt users into prereleases.

Ordinary CI validates structure/attribution, runs Python tests, builds/checks 1.21.11 and
bootstrap, stages real artifacts, audits/tests/bundles the launcher and tests native
startup offline. A manual Compatibility workflow and the Release workflow select every
target. Successful artifacts needed by downstream jobs are retained; diagnostics are
uploaded only on failure. Action permissions are read-only except release publication.

Release publication requires matching versions, full compatibility checks, Windows/Linux
packaging, native packaged-startup checks, generated hashes, asset-digest verification
and real client-download smoke tests. Betas are published as prereleases without changing
the latest stable release. No beta tag is created before local/branch validation passes.

## Local verification and limits

- Clean `build check`: all 13 targets and bootstrap passed in 4m 31s, 194/194 tasks
  executed. Subsequent archive checks passed after adding full distribution notices. The final
  all-target client build/check after the standalone updater change also passed (4m 32s).
- Project, branding and license validation passed; 14 Python and 44 Node tests passed.
  Negative tests reject changed/unattributed assets, missing dependency licenses, corrupt
  updates and incompatible targets. All three workflow YAML files parsed locally.
- A fresh `npm ci`, audit, bundle and offline native startup passed. Windows NSIS/portable
  packages were produced with executable metadata/icons applied and signing explicitly
  disabled. Packaged native startup is also tested with isolated data and network disabled.
- Actual default/versioned Fabric metadata, Daisy entrypoint and bootstrap premain were
  checked by staging; all 13 real client JARs plus the agent staged successfully.
- Generated application/build output, smoke screenshots and local logs remain ignored.
  GitHub workflow execution and publication are independently recorded in Actions/releases.

No interactive installer was executed and no manual Minecraft session was certified in
this audit. Interactive Linux use, every module/mixin in game, optional external services,
and user-supplied optional JARs require their own runtime/provenance checks. Existing Gradle
and dependency deprecation warnings remain. These limits are not presented as successful
manual tests or as a claim that beta gameplay is production-certified.

## Candidate correction

The beta.1 tag remains immutable and unpublished. Its full client compatibility checks and
Linux package build passed, but the packaged Linux smoke test omitted the production
wrapper's `--no-sandbox` argument. Beta.2 corrects that test invocation.

Local smoke testing also exposed an isolation defect: overriding only Electron userData
left the instance directory under the real appData path. The smoke-installed beta client
in the default instance was backed up and replaced with the size/SHA-verified stable
0.2.8.4 client. Worlds and game configuration were untouched. Smoke tests now isolate
appData, userData and sessionData, assert instance containment, and have regression tests.
The corrected native smoke passed with the restored stable client unchanged. Beta caches
also use a separate directory so older stable launchers never parse beta cache filenames.
