# Troubleshooting

## Local accounts and offline play

Create or select an account in Settings > Account. Daisy uses local profiles and local
skins; Microsoft OAuth and ownership services are not part of this launcher. A local
name cannot authenticate to protected multiplayer servers or Microsoft skin/cape APIs.
Use Minecraft in accordance with its own license and server rules.

The launcher shell opens without a network connection. Previously cached Mojang/Fabric
metadata and verified client JARs can be reused. A new installation still needs Java,
game libraries, assets, a loader and support mods; missing files produce an installation
error rather than a false ready state. Set up a matching instance while connected once.
Daisy cannot fabricate missing game assets when offline.

## Updates

Use Settings > Maintenance > Check for updates. A newer compatible launcher enables
Update to <version>. The package's size and SHA-256 are checked before use. Installed
Windows builds open an interactive installer; portable/Linux builds reveal the download.
Network failures are shown explicitly; an unchecked version is not called current.

Client updates choose the exact Minecraft target and retain verified cache fallback.
Disabled clients stay disabled. A hash failure does not replace the working client.
An unsupported Minecraft version does not receive a different target's JAR.

## Optional services

News, social, remote cosmetics and content browsing require their respective services.
Their absence must not block the local launcher or HUD. Existing service URLs are not
claims of service ownership or availability. External profile/skin artifacts remain
optional and are excluded from official packaging without build provenance.

## Reporting

Include Daisy/Minecraft versions, operating system, exact reproduction steps and relevant
logs. Remove tokens and private paths first. Use the issue template. Build failures,
launcher startup failures and in-game mixin errors are different categories; report the
command or phase that failed. [Building](building.md) covers toolchain and packaging issues.
