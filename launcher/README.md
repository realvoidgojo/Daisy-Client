# Daisy Launcher

An Electron/React launcher with local accounts, instance management, cached game setup,
optional content integrations and verified GitHub client/launcher updates.

From this directory:

```sh
npm ci
npm test
npm run build:app
npm run test:startup
npm start
```

Build/stage the default Fabric client and bootstrap first as described in
[building](../docs/building.md). `src/main.js` is the main process, `src/preload.js`
the bridge and `src/renderer-react/main.jsx` the UI entrypoint. `app/` and `dist/`
are generated output. Native releases use `npm run dist` on Windows or
`npm run dist:linux` on Linux.

Startup smoke tests run the real hidden Electron window with isolated local state and
network requests disabled. Release checks separately exercise real verified downloads.
See [architecture](../docs/architecture.md), [updates](../docs/client-updates.md),
[troubleshooting](../docs/troubleshooting.md) and [third-party notices](../THIRD_PARTY_NOTICES.md).
