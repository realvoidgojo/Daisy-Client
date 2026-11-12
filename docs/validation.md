# Local verification: 12 November 2026

Verification was repeated against the current working tree before committing.
No Git history was inspected and no destructive Git commands were used.

- Branding audit: 638 files, 416 justified references, zero unexpected references.
  Negative probes confirmed text/filename detection, dependency-cache pruning and
  a nonzero exit for new references. Full reasons are available with `--show-allowed`.
- Root `gradlew.bat build check --console=plain`: passed on JDK 21 with the cached
  JDK 25 toolchain, all 13 configured Stonecutter targets and bootstrap included.
  Gradle reported 180 up-to-date actionable tasks; this was an incremental build.
- `gradlew.bat -p legacy build --console=plain`: passed, five tasks up to date.
- `npm test --prefix launcher`: all 20 tests passed.
- `npm run dist:dir --prefix launcher`: passed, including `build:app` and Windows
  unpacked Electron packaging.
- `npm run dist --prefix launcher`: passed, producing `Daisy-Setup.exe` and
  `Daisy-Portable.exe` from the staged client artifacts. Neither executable was run.
- `python scripts/package-release.py stage-client`: passed, staging 13 real Fabric
  clients plus the existing bootstrap agent. Each client had matching metadata and
  the Daisy entrypoint; no original-package classes were found. The agent manifest
  contains the coordinated Daisy main and premain classes.
- Both workflow YAML files parsed locally. This does not verify Actions execution.
- `git diff --check`: passed.

The accidental MIT text in the branding report was replaced with the actual audit
and compatibility rationale. The original root license and attribution are preserved.
Python bytecode cache directories are ignored.

## Outputs and limits

Client mods: `versions/<minecraft>/build/libs/daisy-client-0.2.8.1+<minecraft>.jar`.
Bootstrap: `daisy-bootstrap/build/libs/daisy-bootstrap-0.1.9.0.jar`.
Independent legacy mod: `legacy/build/libs/daisy-legacy-0.1.0.jar`.
Windows unpacked launcher: `launcher/dist/win-unpacked/`.
Generated binaries and dependency caches are excluded from the source commit.

No Minecraft session, installed-launcher runtime, installer execution, Linux build,
GitHub Actions run or release publication was verified in this pass. Existing
launcher self-update functions remain disabled. External backend ownership and
availability remain unverified. Written modification/distribution authorization is
unresolved; the original source-available terms and release authorization gate
remain in place. Gradle deprecation and Electron dependency/deprecation warnings
remain; passing builds do not establish runtime correctness of every module.
