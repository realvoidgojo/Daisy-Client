# Daisy Client

Daisy Client is an open-source Minecraft Fabric client and desktop launcher designed for clean offline account management, high performance, and custom cosmetics.

## Features

- **Offline Account Manager**: Multi-offline account support with custom skins and models.
- **Custom Skin & Cape System**: Client-side appearance system:
  - **Local Player Skin Rendering**: Custom skin and model (Classic/Slim) rendered locally for your own player across any server (vanilla, modded, LAN, or SMP) without requiring server-side plugins or mods. Other players and the server will continue to see your server-provided skin or Steve/Alex default.
  - **Non-blocking asynchronous asset caching**: Dynamic texture registration with SHA-256 integrity validation and dimension checks.
- **Modern Desktop Launcher**: Fast and modern Electron UI.
- **Integrated Fabric Client**: Built on Fabric (Fabric-only; Forge/NeoForge/Quilt loaders are not supported). Configured with multi-version Stonecutter targeting versions from 1.21 through 1.21.11, 26.1.2, and 26.2.

## Building

### Fabric Mod
```bash
./gradlew :1.21.11:build -x test
```

### Launcher
```bash
cd launcher
npm install
npm run build:app
npm run dist:dir
```

## License
Open Source.
