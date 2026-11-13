# Contributor guide

## Layout and working style

`src/` is the shared Fabric client, `versions/` the Stonecutter target properties,
`daisy-bootstrap/` the agent and `launcher/` the independent Electron application.
Maintenance/release commands live in `scripts/`; generated output is ignored.
Use focused `feature/`, `fix/` or `codex/` branches and open pull requests against
`main`. The beta foundation work lives on `refactor/1.0-beta-foundation`. Use clear
commit messages describing the resulting behavior. Never rewrite published history.

## Client features

Inspect `DaisyRuntime`, the module registry and a nearby implementation in
`src/client/kotlin/dev/daisy/clientcore/module/impl`. Register a new module through
the existing lifecycle and keep rendering/event hooks in the established HUD/mixin
paths. Preserve config field names or provide a migration. When an API differs across
game versions, use the existing Stonecutter conditions and compatibility helpers.
Run the default client build, then compatibility checks for affected API generations.

## Launcher features

Keep file, process, download and credential operations in the main process. Expose the
smallest useful preload IPC interface and render its state in React. Local accounts and
cached operation must work without a social service. Use clear error/progress states.
Add focused Node tests for updater, filesystem, IPC and migration behavior; UI states
can be rendered in server-side tests. Verify startup separately from bundling.

## Tests and targets

Node tests live in `launcher/tests/`; Python maintenance tests in `scripts/tests/`.
Tests must verify user-visible behavior or an integration contract, including negative
cases for integrity and compatibility. Do not replace an actual artifact with a fake
JAR to make packaging pass.

To add a Minecraft target, add its properties in `versions/`, update the Stonecutter
list, launcher supported-version list and relevant Java/pack-format rules, then build
that target and adjacent API generations. Update documentation and verify exact-target
artifact discovery. A directory alone does not make a version supported.

## Required checks

```sh
python scripts/verify-project.py
python scripts/verify-licenses.py
python scripts/audit-branding.py
python -m unittest discover -s scripts/tests -v
./gradlew :1.21.11:build :1.21.11:check :daisy-bootstrap:build
npm ci --prefix launcher
npm audit --audit-level=high --prefix launcher
npm test --prefix launcher
npm run build:app --prefix launcher
npm run test:startup --prefix launcher
git diff --check
```

Use `gradlew.bat` on Windows. Run all targets before releases and for changes that span
Minecraft APIs. New binary assets require a source, applicable license, notice and hash
in `assets/licenses.json`. Generated project artwork remains intentionally versioned
for runtime use; build outputs, local caches and temporary screenshots do not.
