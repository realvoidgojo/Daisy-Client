# Daisy Client

Daisy Client contains a Fabric Minecraft client and an Electron/React desktop launcher.
The shared Kotlin/Java client sources live in `src/client`; Stonecutter builds them for
multiple Minecraft versions. The Electron launcher lives in `launcher/` and uses npm
and electron-builder. It is not a Gradle module or a JAR.

## Requirements and supported targets

Use the checked-in Gradle wrapper, Python 3, Node.js 24 and npm. Install JDK 21 and
JDK 25 and make both discoverable to Gradle. Run Gradle on JDK 21; the per-target
Java/Kotlin toolchains select 21 for 1.21.x and 25 for 26.x.

The authoritative target list is in `settings.gradle.kts`:

`1.21`, `1.21.1`, `1.21.2`, `1.21.3`, `1.21.4`, `1.21.5`, `1.21.6`,
`1.21.7`, `1.21.8`, `1.21.10`, `1.21.11`, `26.1.2`, `26.2`.

`versions/1.21.9/gradle.properties` exists but 1.21.9 is not configured or supported.
Configured targets are build targets, not a claim that each has been tested in game.
The client mod requires Fabric Loader, Fabric API and Fabric Language Kotlin. Other
launcher loader choices do not make this Fabric client compatible with those loaders.

## Client build and validation

From the repository root (use `gradlew.bat` in PowerShell):

```sh
./gradlew build check --console=plain
./gradlew :1.21.11:build
python scripts/audit-branding.py
python scripts/audit-branding.py --show-allowed
```

The unqualified `build check` selects all configured Stonecutter targets and the existing
bootstrap component. Client artifacts are
`versions/<minecraft>/build/libs/daisy-client-0.2.8.1+<minecraft>.jar`.
Source JARs are also generated; use the regular versioned JAR as the mod.
The source-controlled active version remains 1.21.11. No extra client/launcher Gradle
modules or separate launcher JARs are required.

`daisy-bootstrap/` (formerly `river-bootstrap/`) remains an existing Gradle component.
Its executable/agent JAR supports the launcher's existing injection fallback and is
not a second client mod. Its launcher discovery paths and manifest classes are renamed
together. JVM property names used by existing launch configurations are preserved.

`legacy/` is a separate Legacy Fabric 1.8.9 build, not a Stonecutter target. Its sources
and package names are rebranded, while its mod/resource identifiers remain compatible.
See [legacy/README.md](legacy/README.md); it is not packaged by the main release workflow.

## Launcher build, tests and packaging

```sh
cd launcher
npm ci
npm test
npm run build:app
npm start
```

`build:app` bundles the main process, preloads, React UI and styles into `launcher/app/`.
`npm start` rebuilds and opens Electron. Unit tests run with Node's built-in test runner.
The existing optional Daisy Skin artifact test validates manifest metadata and hashes
any local skin JARs available. Set `DAISY_REQUIRE_SKIN_ARTIFACTS=1` to require every local
skin artifact; those ignored binaries are not reproducible standalone Gradle outputs.

To bundle the current client builds into the launcher, build all Gradle targets, then
run from the repository root:

```sh
python scripts/package-release.py stage-client
```

This validates Fabric metadata and entrypoints and stages the actual versioned client
JARs plus the bootstrap agent into `launcher/src/bundled/`. It never creates new JARs.
Then, from `launcher/`, choose a supported Electron distribution:

```sh
npm run dist:dir          # Windows unpacked application: dist/win-unpacked/
npm run dist             # Windows NSIS installer and portable executable
npm run dist:installer   # dist/Daisy-Setup.exe
npm run dist:portable    # dist/Daisy-Portable.exe
npm run dist:linux       # dist/Daisy-Linux.tar.gz (experimental)
```

Build Windows distributions on Windows and Linux distributions on Linux. Packaging
inputs (icons and NSIS footer) are checked in under `launcher/packaging/`. The Linux
archive contains `Daisy-Linux/daisy`; its existing wrapper uses `--no-sandbox`.
The launcher can download matching client builds from a release manifest and still
recognizes older `clientcore-*.jar` names for installed instances.

## CI and releases

`.github/workflows/ci.yml` runs the branding audit, `build check` for every configured
client target, launcher tests, renderer/main-process bundling and Windows directory
packaging. It collects actual Fabric/agent JARs and the unpacked Electron application.
Workflow execution on GitHub is separate from local verification.

`.github/workflows/release.yml` runs for `v*` tags and first reuses CI. Distribution and
publication are gated by the repository variable `DAISY_DISTRIBUTION_AUTHORIZED=true`;
set it only after written authorization is documented. The tag must equal
`v<launcher/package.json daisyVersion>` (currently `v0.2.8.1`). Keep that client version,
the version in `build.gradle.kts`, and `launcher/src/config/build-version.json` consistent when
preparing the next release. Electron's three-part `package.json version` is separate.

The workflow stages the verified Fabric clients into each Electron build, packages
Windows NSIS/portable and Linux tar distributions, then generates `latest.json` and
`SHA256SUMS` from the produced files using `scripts/package-release.py collect --tag
v<version>`. It uploads those artifacts to a GitHub Release. It does not invent a
launcher JAR or publish the independent Legacy Fabric build.

The client-mod download manifest URL defaults to this repository's GitHub Releases `latest.json`
asset; `DAISY_UPDATE_MANIFEST_URL` overrides it. The checked-in update manifest has no
unverified download links or reused upstream hashes. Until an authorized Daisy release
exists, remote update downloads may be unavailable; bundled client builds still work.
The existing launcher self-update watcher, check and install functions are disabled
stubs in this working tree and remain disabled. Install Electron releases manually;
no automatic launcher self-update or differential update behavior is claimed.

Existing `npm run release:draft` / `publish:update` scripts support the separate external
Cloudflare/site release infrastructure. Draft generation reads Git history, so it was
not run during this working-tree-only audit. `publish:update` now requires explicit
`DAISY_DISTRIBUTION_AUTHORIZED`, `DAISY_SITE_BASE_URL`, `DAISY_UPDATE_BASE_URL` and
`DAISY_UPDATE_BUCKET` settings, Cloudflare credentials, and the external site/worker
projects. Those projects are absent here; this route was not deployed or verified.
Do not point Daisy publishing scripts at upstream infrastructure without authorization.

## Compatibility and audit scope

See [docs/branding-audit.md](docs/branding-audit.md) for retained identifiers and blockers.
The audit scans working-tree filenames and UTF-8 source/config/documentation, including
untracked files, while pruning dependency caches and build outputs. Exact line exceptions
have occurrence limits and reasons; immutable legal/history exceptions have SHA-256
snapshots. Unexpected references exit nonzero. Use `--show-allowed` for file/line evidence.
No redundant `verify-project.py` is needed: Gradle, npm, the branding audit and real
artifact packaging cover the required checks.
