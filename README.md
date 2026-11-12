# Daisy Client

Daisy Client contains a Fabric Minecraft client and an Electron/React desktop launcher.
Maintained by **realvoidgojo**. It provides configurable HUD modules, cosmetics,
instance management, content downloads and launcher account integration.
The shared Kotlin/Java client sources live in `src/client`; Stonecutter builds them for
multiple Minecraft versions. The Electron launcher lives in `launcher/` and uses npm
and electron-builder. It is not a Gradle module or a JAR.

## Installation

Download the matching Fabric client JAR and the native Daisy Launcher separately
from [GitHub Releases](https://github.com/realvoidgojo/Daisy-Client/releases).
Install the client into the `mods/`
directory of a matching Minecraft/Fabric profile with Fabric API and Fabric
Language Kotlin. On Windows run the launcher installer or portable executable;
on Linux extract the launcher archive and run `./daisy`. Sign in and create an
instance with the matching Minecraft version. Minecraft access requires an
appropriate account. Release checksums accompany the downloads.

## Structure

`src/client/` holds shared Kotlin/Java client sources and resources;
`src/main/resources/` holds Fabric metadata. `versions/` defines game targets.
`daisy-bootstrap/` contains the existing Java agent, `launcher/` the independent
Electron app, `scripts/` maintenance tools and `docs/` migration evidence.
See [CONTRIBUTING.md](CONTRIBUTING.md) for development and branch conventions.

## Requirements and supported targets

Use the checked-in Gradle wrapper, Python 3, Node.js 24 and npm. Install JDK 21 and
JDK 25 and make both discoverable to Gradle. Run Gradle on JDK 21; the per-target
Java/Kotlin toolchains select 21 for 1.21.x and 25 for 26.x.

The authoritative target list is in `settings.gradle.kts`:

`1.21`, `1.21.1`, `1.21.2`, `1.21.3`, `1.21.4`, `1.21.5`, `1.21.6`,
`1.21.7`, `1.21.8`, `1.21.10`, `1.21.11`, `26.1.2`, `26.2`.

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
`versions/<minecraft>/build/libs/daisy-client-<client-version>+<minecraft>.jar`.
Source JARs are also generated; use the regular versioned JAR as the mod.
The source-controlled active version remains 1.21.11. No extra client/launcher Gradle
modules or separate launcher JARs are required.

`daisy-bootstrap/` remains an existing Gradle component.
Its executable/agent JAR supports the launcher's existing injection fallback and is
not a second client mod. Its launcher discovery paths and manifest classes are renamed
together. JVM property names used by existing launch configurations are preserved.

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

`.github/workflows/release.yml` runs for version tags and manual dispatch. It validates
coordinated versions, reuses CI, packages Windows installer/portable and Linux tar
builds, and publishes a complete GitHub Release. Existing releases are never overwritten.
No external hosting service or distribution variable is needed for GitHub Releases.

Prepare the next release with:

```sh
python scripts/prepare-release.py <client-version> --launcher-version <electron-version>
```

This updates Gradle, npm package/lock metadata and build metadata together. Update
`CHANGELOG.md`, run the contribution checks, commit, and push `main` with a matching
`v<client-version>` tag. The tag must match `launcher/package.json daisyVersion`.
Electron's package version must be a separate three-part version. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the publishing commands.

The release workflow stages verified Fabric clients and the bootstrap agent into
both launcher distributions. It generates `latest.json` and `SHA256SUMS` from the
produced files, uploads all assets, and verifies their published digests. It then
exercises the production client updater against real released JARs for Minecraft
1.21.11 and 26.2, including cache reuse, offline reuse and instance installation.
A failed verification marks the workflow failed; publication is not rolled back.

### Automatic client updates

Daisy instances check this repository's latest stable GitHub release when created
and before launch. The launcher downloads the exact Minecraft-version client JAR,
checks its size and SHA-256, and installs it before removing older client versions.
New client releases do not require reinstalling the launcher. Disabled clients stay
disabled. Verified cached or bundled clients remain available when GitHub is offline;
Minecraft, loader and account setup can still require a network connection.

`DAISY_UPDATE_MANIFEST_URL` overrides the manifest endpoint for development. Downloaded
client JARs still must belong to this repository's matching versioned GitHub release.
The local `update-manifest.json` is a development placeholder; production release
metadata is generated from build outputs. See [client update behavior](docs/client-updates.md).

Launcher application updates are separate from client JAR updates. In Settings > Maintenance,
select **Check for updates** to see the installed and latest versions, then **Update to
<version>** to download a newer launcher. Failed checks show an error and can be retried.
The launcher checks
GitHub manifests and verifies native distribution downloads. Installed Windows builds
open the interactive installer; portable and Linux builds reveal the verified download
for replacement. Installer handoff and in-game behavior require manual runtime testing.

The optional `launcher/scripts/publish-update.js` path targets separate Cloudflare
infrastructure and is not used by the GitHub release workflow.

## Compatibility and audit scope

See [docs/branding-audit.md](docs/branding-audit.md) for retained identifiers and blockers.
The audit scans working-tree filenames and UTF-8 source/config/documentation, including
untracked files, while pruning dependency caches and build outputs. Exact line exceptions
have occurrence limits and reasons; immutable legal/history exceptions have SHA-256
snapshots. Unexpected references exit nonzero. Use `--show-allowed` for file/line evidence.
Run `python scripts/verify-project.py` for source/package/resource consistency.
Run `python scripts/clean-build.py` for a clean client build, tests, staging and
native launcher packaging (Windows or Linux). Use `--skip-install` to reuse npm
dependencies. Generate the complete evidence inventory with
`python scripts/audit-branding.py --report build/reports/branding.json`.

## License and attribution

Daisy Client and Daisy Launcher are open source software licensed under the [MIT License](LICENSE).
Copyright (c) realvoidgojo. All third-party libraries and font notices are acknowledged in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
