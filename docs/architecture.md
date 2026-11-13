# Architecture

## Fabric client

`src/client/kotlin/dev/daisy/clientcore/ClientCore.kt` is the Fabric client entrypoint.
It delegates to `DaisyRuntime`, which loads configuration, registers modules and connects
HUD/menu/event behavior. Java mixins in `src/client/java` are listed in
`src/client/resources/clientcore.mixins.json`; `fabric.mod.json` declares `clientcore`
and its Kotlin entrypoint. The mod ID and resource namespace remain stable for saves
and resource-pack overrides.

The module registry and `module/impl` hold feature behavior; HUD rendering lives in
`hud/`, UI/screens in `ui/`, compatibility helpers in `compat/`, and configuration
serialization in `config/`. Add features through these existing registries rather
than creating a parallel initialization path. Social and cosmetic network integrations
are separate from local rendering and module configuration.

## Shared source strategy

Stonecutter preprocesses one `src/` tree for every target in `settings.gradle.kts`.
`versions/<minecraft>/gradle.properties` supplies Fabric/API/Kotlin and resource-pack
versions. Conditional comments select API differences; the checked-in active version
is 1.21.11. Generated source belongs under target `build/` directories.

Root `build.gradle.kts` is deliberately retained: moving it into a cosmetic `client/`
module would change Stonecutter preprocessing, resource paths, artifact discovery,
validation and packaging. `daisy-bootstrap/` likewise stays at its proven Gradle path.
The layout is documented instead of introducing duplicate modules.

## Launcher and bootstrap

`launcher/src/main.js` is the Electron entrypoint. Preload bridges expose selected IPC
channels; `renderer-react/main.jsx` renders the React application. `build-app.js`
produces ignored `launcher/app/` output for Electron packaging.

The launcher manages local profiles, instances, Java/game downloads and optional
content. Local profile creation and startup do not depend on Microsoft, news or social
services. Game metadata is cached separately from account data. First installation
still needs the game/loader/support files; an empty cache cannot manufacture them.

Daisy normally loads as a Fabric mod in the instance. `daisy-bootstrap/` is the existing
Java agent fallback, with `dev.daisy.bootstrap.Agent` as premain and `MainKt` as its
legacy executable entrypoint. It is not another client or launcher.

## Updates and release boundaries

The release pipeline builds real client/agent JARs, stages them into native launcher
packages, and generates hashes from those bytes. `launcher/src/daisy-mod-cache.js`
validates exact-target GitHub client and standalone-skin downloads; `launcher-release.js` handles native
launcher distribution checks. Version rules are shared in `version.js` and mirrored by
release-script tests in `scripts/versioning.py`. Stable and beta discovery are separate.
No credentials or opaque optional skin JARs are included in official packaging.

Standalone skins reuse the compiled appearance subset through `scripts/skin_artifact.py`.
See [local skins](daisy-skin.md) for the source and distribution contract.
