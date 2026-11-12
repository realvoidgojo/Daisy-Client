# Automatic client updates

The launcher reads `latest.json` from the latest stable release in
`realvoidgojo/Daisy-Client`. The release workflow generates this manifest from
the built artifacts, including a Minecraft target, filename, immutable release
URL, byte size and SHA-256 for every client JAR.

A new Daisy instance starts with its bundled client and checks for a newer one
in the background. Before launch, the launcher waits for the update check and
installation to finish. Plain Fabric, Forge, Quilt and vanilla instances do not
receive the Daisy mod. Client releases can update independently of the launcher.

The updater accepts only an exact Minecraft target, matching release version and
filename, and an HTTPS asset URL in this repository's versioned GitHub Releases.
Unsupported or malformed manifest entries are ignored. It never substitutes a
JAR for a different Minecraft version or downgrades a newer local client.

Downloads use temporary files. Both byte size and SHA-256 must match before a
file enters the cache. Concurrent requests for the same Minecraft target share
one operation. Cache receipts retain the release metadata; offline requests
recheck the cached bytes against the receipt. Unverified or corrupt cache files
are not selected. Failed updates fall back to a verified cache or bundled JAR
when available, and the launcher records the reason in its log.

The replacement is copied into the instance before older clients are removed.
Existing disabled clients remain disabled across version changes. User settings,
worlds and unrelated mods are preserved. Installing a client does not start
Minecraft; the normal account, Java, loader and game setup still applies.

## Verification

`launcher/tests/daisy-mod-cache.test.js` covers target selection, invalid metadata,
checksums, corrupt downloads, concurrent requests, offline cache validation,
downgrade prevention and instance replacement. The release workflow also runs
`launcher/scripts/verify-client-update.js` against actual published assets for
Minecraft 1.21.11 and 26.2. It checks download integrity, cache reuse, offline
reuse and installation into a temporary instance. `scripts/verify-release.py`
checks the entire published asset inventory and upload digests.

These checks do not launch Electron, run Minecraft or exercise an OS installer.
Record those runtime checks separately when testing a release.
