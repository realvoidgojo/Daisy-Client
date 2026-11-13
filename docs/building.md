# Building

## Tools

Use the checked-in Gradle wrapper (9.6.1), JDK 21 to run Gradle, JDK 21/25 toolchains,
Node.js 24 with npm and Python 3.10+. Python validation/tests use the standard library.
Only artwork regeneration needs `python -m pip install -r scripts/requirements-art.txt`.
The artwork source is `assets/artwork.json` and `scripts/generate-assets.py`.

## Default development build

```sh
./gradlew :1.21.11:build :1.21.11:check :daisy-bootstrap:build
python scripts/package-release.py stage-client --minecraft 1.21.11
npm ci --prefix launcher
npm test --prefix launcher
npm run build:app --prefix launcher
npm run test:startup --prefix launcher
npm start --prefix launcher
```

Use `gradlew.bat` on Windows. Set `JAVA_HOME` to JDK 21; make both toolchains
discoverable or pass `-Porg.gradle.java.installations.paths=<jdk21>,<jdk25>`.
The artifact is `versions/1.21.11/build/libs/daisy-client-<version>+1.21.11.jar`.
A sources JAR is for development and is not the installable mod.

## Compatibility and packaging

```sh
./gradlew clean build check --console=plain
python scripts/package-release.py stage-client
npm run dist --prefix launcher
```

Run Windows packaging on Windows. On Linux use `npm run dist:linux --prefix launcher`.
Outputs are `launcher/dist/Daisy-Setup.exe`, `Daisy-Portable.exe` and
`Daisy-Linux.tar.gz`. `python scripts/clean-build.py` provides the full clean build and
native packaging; `--default-only` selects the normal development target.

Do not stage a partial client set for a release: release collection requires every
configured target and both operating systems' distributions. The agent must have the
expected premain manifest. Staging also derives standalone local-skin JARs from the compiled
appearance subset. Opaque externally supplied skin/authentication-agent binaries are excluded.

## Common failures

- Toolchain not found: install JDK 21/25 or provide their paths. Running on an older JDK
  is different from having an installed compiler toolchain.
- `npm ci` integrity failure: retry with the committed lockfile and an accessible npm
  registry. Do not edit integrity values to suppress validation.
- Missing staged clients: build Gradle first, then run `package-release.py stage-client`.
- Native helper unavailable on Linux: Windows media-session integration is optional.
- Gradle deprecation/mixin warnings: record them separately from task failures. A
  successful compilation does not demonstrate every mixin's behavior in game.
- Startup smoke failure: inspect `build/reports/launcher-smoke.png` and process output.
  The smoke uses a temporary user-data directory and disables network requests.
