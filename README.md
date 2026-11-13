# Daisy Client · 1.0

Daisy is a Fabric Minecraft client and native desktop launcher for local-account play.
It combines configurable HUD modules, visual effects, cosmetics, instance management
and optional performance mods. Core local play does not require Microsoft or social sign-in.

Automated builds and startup checks cover the configured targets; they do not certify
every module in game. Minecraft itself is a separate product; Daisy does not grant
access to authenticated servers or paid online services.

## Install

Get the latest stable build from [GitHub Releases](https://github.com/realvoidgojo/Daisy-Client/releases/latest).
Choose `Daisy-Setup.exe` (Windows installer), `Daisy-Portable.exe`, or
`Daisy-Linux.tar.gz` (Linux x64, experimental). Create a local account, choose a
Minecraft version, and create an instance. The launcher manages the matching client
JAR. To use another Fabric launcher, install the exact-version Daisy client JAR with
Fabric API and Fabric Language Kotlin in its `mods/` directory.

First-time game, loader, Java and support-mod installation needs a network connection.
After setup, cached game metadata, assets and verified client JARs can be reused
locally. Cosmetics, news, content browsing and social services are optional network
features and may be unavailable. See [offline troubleshooting](docs/troubleshooting.md).

## Supported Minecraft versions

Default development target: **1.21.11** (JDK 21).
Compatibility builds: 1.21, 1.21.1, 1.21.2, 1.21.3, 1.21.4, 1.21.5, 1.21.6,
1.21.7, 1.21.8, 1.21.10, 1.21.11, 26.1.2 and 26.2.
The 26.x targets require JDK 25. These are configured build targets, not in-game
certification. `settings.gradle.kts` is authoritative.

## Develop

Install JDK 21 and 25, Node.js 24 with npm, and Python 3.10+. Run Gradle on JDK 21.
From the repository root (use `gradlew.bat` on Windows):

```sh
python scripts/verify-project.py
python scripts/verify-licenses.py
python scripts/audit-branding.py
python -m unittest discover -s scripts/tests -v
./gradlew :1.21.11:build :1.21.11:check :daisy-bootstrap:build
npm ci --prefix launcher
npm test --prefix launcher
npm run build:app --prefix launcher
npm run test:startup --prefix launcher
```

Stage the actual default client before running the launcher:

```sh
python scripts/package-release.py stage-client --minecraft 1.21.11
npm start --prefix launcher
```

For every configured target, use `./gradlew clean build check --console=plain`, then
`python scripts/package-release.py stage-client`. Native packaging uses
`npm run dist --prefix launcher` on Windows or `npm run dist:linux --prefix launcher`
on Linux. [Building](docs/building.md) covers toolchains and common failures.

## Repository and contribution

Shared client sources remain in `src/`, per-target properties in `versions/`, the
existing agent in `daisy-bootstrap/`, and Electron/React sources in `launcher/`.
This preserves Stonecutter's source preprocessing and the proven release layout.
There is no duplicate `client/` module or launcher JAR.

Start with [CONTRIBUTING.md](CONTRIBUTING.md), [architecture](docs/architecture.md)
and the [contributor guide](docs/contributing.md). Bug and feature templates are
available on GitHub. [The foundation audit](docs/foundation-audit.md) records cleanup,
baseline checks, attribution decisions and verification limits.

## Updates and releases

Maintenance settings show the installed/latest launcher versions and offer a verified
native update download. Client JARs update independently before launch, with exact
Minecraft target selection, size/SHA-256 verification and cached fallback.
[Client updates](docs/client-updates.md) describes the integrity checks.

CI builds the default target on ordinary changes. Compatibility builds are manual;
releases build all targets. Beta tags such as `v1.0.0-beta.1` publish GitHub prereleases.
Stable installations stay on stable releases; beta installations opt into beta discovery.
See [releasing](docs/releasing.md) for coordinated versions, staging and checksums.

## License and attribution

Daisy source and original generated artwork are [MIT licensed](LICENSE). Third-party
fonts, Lucide icons, dependencies, Minecraft and independently installed mods retain
their own licenses. [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and
[the asset inventory](assets/licenses.json) identify their provenance. CI checks
notices, locked dependency license metadata and binary-asset hashes. This validation
is evidence of recorded attribution, not a legal certification of external services.

## Known limitations

Local accounts cannot authenticate to Microsoft services or protected multiplayer
servers. Source-built standalone local-skin JARs are available for plain Fabric instances;
full Daisy includes the same support. Linux installer replacement and in-game behavior still
need platform/runtime testing; automated startup tests exercise Electron with isolated
state and network access disabled. No screenshots of third-party game content are
redistributed as promotional artwork.
