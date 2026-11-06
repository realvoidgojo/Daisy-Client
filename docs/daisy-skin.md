# Daisy Skin & Wardrobe Mod Separation

## Overview
The wardrobe skin-injection feature has been separated into an optional, dedicated Fabric mod: **Daisy Skin** (`daisyskin`) by `realvoidgojo`.

## Technical Identity
- **Display Name**: Daisy Skin
- **Mod ID**: `daisyskin`
- **Artifact Name**: `daisy-skin`
- **Version**: `0.1.0+<mc_version>`
- **Author**: `realvoidgojo`

## Local Artifact Architecture
Standalone artifacts and deterministic SHA-256 manifests are generated in:
- `local-artifacts/skin/<minecraft-version>/daisy-skin-0.1.0+<minecraft-version>.jar`
- `local-artifacts/skin/manifest.json`
- Bundled into launcher via `launcher/src/bundled/skin/`

## Supported Minecraft Versions
| Minecraft Version | Loader | Status | Artifact |
|---|---|---|---|
| 1.21 | Fabric | Ready | daisy-skin-0.1.0+1.21.jar |
| 1.21.1 | Fabric | Ready | daisy-skin-0.1.0+1.21.1.jar |
| 1.21.2 | Fabric | Ready | daisy-skin-0.1.0+1.21.2.jar |
| 1.21.3 | Fabric | Ready | daisy-skin-0.1.0+1.21.3.jar |
| 1.21.4 | Fabric | Ready | daisy-skin-0.1.0+1.21.4.jar |
| 1.21.5 | Fabric | Ready | daisy-skin-0.1.0+1.21.5.jar |
| 1.21.6 | Fabric | Ready | daisy-skin-0.1.0+1.21.6.jar |
| 1.21.7 | Fabric | Ready | daisy-skin-0.1.0+1.21.7.jar |
| 1.21.8 | Fabric | Ready | daisy-skin-0.1.0+1.21.8.jar |
| 1.21.10 | Fabric | Ready | daisy-skin-0.1.0+1.21.10.jar |
| 1.21.11 | Fabric | Ready | daisy-skin-0.1.0+1.21.11.jar |
| 26.1.2 | Fabric | Ready | daisy-skin-0.1.0+26.1.2.jar |
| 26.2 | Fabric | Ready | daisy-skin-0.1.0+26.2.jar |

## Launcher Integration
1. **New Instance Page**: Contains the optional **Daisy Skin** toggle under loader settings for Fabric instances.
2. **Metadata & Lifecycle**: Instances store `daisySkin: true` and install `daisy-skin-0.1.0+<mc>.jar` into `mods/`.
3. **Toggle & Removal**: If disabled, only the Daisy Skin mod is omitted/removed; user worlds, configs, and Client Core mods are preserved.

