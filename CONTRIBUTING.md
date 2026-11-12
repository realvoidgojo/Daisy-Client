# Contributing to Daisy Client

Install JDK 21 and 25, Node.js 24, npm and Python 3. Run Gradle using JDK 21;
the configured target toolchains select the required bytecode version.
Use `npm ci --prefix launcher` to install the locked launcher dependencies.

Keep `main` as the development branch and use focused `codex/<description>` or
`feature/<description>` branches. Open pull requests against `main` with a clear
description of behavior changes and the checks actually run. Do not rewrite
shared history. Release publication is handled by the version-tag workflow.

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
and Electron runtime checks separately from compilation.

## Releases

Choose unused, increasing versions, then coordinate the metadata automatically:

```sh
python scripts/prepare-release.py <client-version> --launcher-version <electron-version>
```

Update `CHANGELOG.md` and run the checks above. Commit the reviewed files, create an
annotated tag matching `daisyVersion`, and push both references together:

```sh
git tag -a v<client-version> -m "Daisy Client <client-version>"
git push --atomic origin main v<client-version>
```

Follow the Release workflow through validation, Windows/Linux packaging, publication,
asset digest verification and real client-download smoke checks. A successful workflow
covers publication as well as build output. Do not move existing release tags. Fix a
failed published release in a new version so installed clients can update consistently.

To recheck an existing version from its corresponding checkout:

```sh
python scripts/verify-release.py --tag v<client-version>
node launcher/scripts/verify-client-update.js v<client-version> 1.21.11
node launcher/scripts/verify-client-update.js v<client-version> 26.2
```
