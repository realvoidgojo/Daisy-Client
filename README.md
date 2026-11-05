# Daisy Client

Daisy Client is an open-source Minecraft Fabric client and desktop launcher designed for clean offline account management, high performance, and custom cosmetics.

## Features

- **Offline Account Manager**: Multi-offline account support with custom skins and models.
- **Custom Skin & Cape System**: Client-side appearance system allowing Daisy users to see each other's custom skins and capes on any server without server plugins.
- **Modern Desktop Launcher**: Fast and modern Electron UI.
- **Integrated Fabric Client**: Built on modern Fabric with optimizations and HUD utilities.

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
