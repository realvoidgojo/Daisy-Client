# Changelog

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
