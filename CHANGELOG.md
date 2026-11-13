# Changelog

## 1.0.0 — 2026-11-13

- Published the 1.0 foundation as a stable GitHub Latest release so installed 0.2.8.4 launchers discover the upgrade.
- Synchronized client, skin JARs, bootstrap, launcher, package lock and update metadata to 1.0.0/stable.
- Automated version/channel consistency checks and coordinated development update metadata.
- Verified GitHub Latest and the stable manifest endpoint after publication.
- Added a real Windows package download/hash/cache check using the original 0.2.8.4 updater.
- Includes local accounts, source-built skin support, GitHub-backed client updates and the Windows ICO fixes from the beta line.

## 1.0.0-beta.3 — 2026-11-13

- Merged the validated foundation into main while retaining Git history.
- Applied Daisy's ICO to Windows taskbar buttons and newly pinned shortcuts.
- Automated source-built standalone local-skin JARs for all 13 Minecraft targets.
- Published skin artifacts and hashes alongside clients and native launchers on GitHub Releases.
- Added verified skin downloads, offline cache reuse, atomic updates and duplicate-mod prevention.
- Synchronized local skin PNGs, hash-addressed caches and classic/slim appearance metadata before launch.
- Reused installed Fabric support dependencies offline and blocked incomplete dependency setup.
- Extended release verification to real client and skin download/install/cache checks.

## 1.0.0-beta.2 — 2026-11-13

- Isolated native startup tests from real launcher instances by overriding all Electron data paths.
- Matched the packaged Linux smoke test to the archive startup wrapper.
- Separated beta client caches from stable caches for compatibility with older launchers.
- Retained the unpublished beta.1 tag after its Linux startup check failed; no release assets were published.

## 1.0.0-beta.1 — 2026-11-13

- Established a contributor-friendly beta foundation while preserving the Stonecutter layout.
- Kept local accounts and removed unused Microsoft sign-in UI and ownership-service code.
- Made launcher startup independent of network services and cached Mojang/Fabric metadata for local reuse.
- Added beta-aware client filenames, version ordering and separate stable/beta update discovery.
- Added fast default-target CI, optional full compatibility checks and prerelease publication.
- Replaced unverified bitmap artwork with original reproducible geometric assets and recorded asset provenance.
- Excluded opaque optional skin binaries and removed stale generated/debug records.
- Updated Electron and packaging dependencies, removed the unused WebGL viewer dependency, and patched minimatch.
- Added an offline native-startup smoke test, license validation, templates and focused maintenance documentation.

## 0.2.8.4 — 2026-11-12

- Added installed/latest launcher versions and direct update controls to Settings > Maintenance.
- Show checking, downloading and retry states without claiming an unchecked launcher is current.
- Recheck GitHub before installing and reject update attempts after a failed release check.

## 0.2.8.3 — 2026-11-12

- Download the latest exact-version client from GitHub when creating or launching Daisy instances.
- Validate release URLs, Minecraft targets, file sizes and SHA-256 hashes.
- Recheck cached clients for offline use and share concurrent downloads.
- Install replacements before cleanup and preserve disabled clients and newer local versions.
- Fixed duplicate IPC registration and restored compatible launcher APIs.
- Automate coordinated release metadata and verify published assets and real client downloads in CI/CD.

## 0.2.8.2 — 2026-11-12

- Fixed the branding audit to accept Daisy branding while detecting legacy names.
- Aligned bundled certificate and cosmetic asset filenames with their Daisy references.
- Restored historical release records and font provenance notices.
- Corrected the Intel graphics performance JVM option.
- Updated the bootstrap agent and core client runtime.

## 0.2.8.1

- Fully transitioned Daisy Client to the open-source MIT License.
- Preserved the multi-version Fabric client, bootstrap agent and Electron launcher.
- Added repeatable structure validation, branding inventory and clean builds.
- Coordinated checksummed client and native launcher release packaging.
- Included MIT license and third-party dependency notices in distribution inputs.
