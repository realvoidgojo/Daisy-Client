# Bundled Daisy runtime

Run `./gradlew build check` at the repository root, then
`python scripts/package-release.py stage-client` to validate and stage the actual
Stonecutter outputs here. Rebuild the Electron application afterwards.

The launcher selects `daisy-client-<version>+<minecraft>.jar` for the exact instance
Minecraft version. Older `clientcore-*.jar` filenames remain recognized. No matching
client means that no mismatched client JAR is injected. The existing bootstrap agent
is a fallback launch component, not a separate mod or launcher JAR.

All configured targets share `src/client/` through Stonecutter; there are no independent
version source forks. The skin subfolder and artifact manifests describe optional local
assets whose build provenance is separate from the main Gradle client build.
