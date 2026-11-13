# Local skins and the standalone Fabric mod

Daisy Client already includes local-player skins. Plain Fabric instances can select
Daisy Skin to use the standalone `daisy-skin-<version>+<minecraft>.jar`. This does not
change remote players or authenticate to protected multiplayer services.

## Reproducible source

`src/client/java/dev/daisy/clientcore/mixin/AvatarSkinMixin.java` and the five appearance
model/cache/service classes in `src/client/kotlin/dev/daisy/clientcore/cosmetic/` are
compiled and remapped by the normal Stonecutter builds. `scripts/skin_artifact.py`
packages that exact compiled subset, with its inner classes, license notices and a
skin-only mixin configuration. The packager rejects unbundled Daisy class dependencies.
There is no separate opaque binary input or copied source tree. Repeated packaging of
the same client produces identical bytes.

The standalone mod declares its exact Minecraft/Java/Fabric dependencies and a conflict
with `clientcore`, because both contain the shared skin classes. The launcher uses built-in
support in full Daisy instances and disables standalone duplicates while preserving them.

## Automated distribution

`python scripts/package-release.py stage-client` builds/stages skins for every selected
client target. Both native packages bundle those JARs. The release workflow publishes
13 clients, 13 standalone skins, Windows installer/portable, Linux archive, `latest.json`
and `SHA256SUMS`. The manifest's `skins` array carries exact targets, immutable GitHub
asset URLs, sizes and SHA-256 hashes. Published-download checks cover client and skin
artifacts on both older and newer API generations.

Before a skin-enabled plain Fabric launch, the launcher retrieves the latest compatible
skin artifact from the configured GitHub release channel, verifies its bytes and installs
it atomically. Verified cached/bundled artifacts remain usable offline. Required installed
Fabric dependencies are reused without querying Modrinth. Fresh dependencies/game files
still need a connection. Disabled skin mods remain disabled across updates.

The launcher synchronizes the selected PNG, hash-addressed asset cache and
`daisy/config/local_appearance.json` before starting Java, including the classic/slim
model. Local appearance is visible to the local player; no remote-player skin service is
promised. Automated builds do not replace visual in-game testing on each target.

Old ignored `bundled/skin/0.1.0` artifacts and external authentication-agent binaries
remain excluded. Release packages use only the coordinated source-built flat bundles.
