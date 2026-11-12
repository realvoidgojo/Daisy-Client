# Contributing to Daisy Client

Install JDK 21 and 25, Node.js 24, npm and Python 3. Run Gradle using JDK 21;
the configured target toolchains select the required bytecode version.
Use `npm ci --prefix launcher` to install the locked launcher dependencies.

Keep `main` as the development branch and use focused `codex/<description>` or
`feature/<description>` branches. Open pull requests against `main` with a clear
description of behavior changes and the checks actually run. Do not rewrite
shared history. This migration does not alter branches or publish releases.

Follow existing Kotlin, Java and JavaScript conventions. Keep packages aligned
with directories and preserve Stonecutter conditional comments. Source stays in
`src/client`; version directories hold target properties and generated outputs.
Do not commit generated binaries, secrets or local paths. Keep compatibility
identifiers unless readers and stored data have a tested migration. All contributions
are provided under the MIT License.

Before a pull request run:

```sh
python scripts/verify-project.py
python scripts/audit-branding.py --show-allowed
python -m unittest discover -s scripts/tests -v
./gradlew build check --console=plain
npm test --prefix launcher
npm run build:app --prefix launcher
```

Use `gradlew.bat` on Windows. `python scripts/clean-build.py` performs a clean
build and native packaging; it installs dependencies by default. Add tests for
changed update, download, migration and packaging behavior. Record actual game
and Electron runtime checks separately from compilation. To prepare a release, coordinate
the client version in Gradle, `daisyVersion` and `build-version.json`, then tag
`v<daisyVersion>`. Electron's package version is a separate three-part version.
