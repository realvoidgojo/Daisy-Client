# Daisy branding audit

The working tree retains the Fabric client under `src/client`, all 13 configured
Stonecutter targets, the independent `legacy/` build, the renamed
`daisy-bootstrap/` component and the Electron launcher. No launcher JAR or artificial
Gradle modules were introduced. The bootstrap is retained for the launcher agent
fallback. The independent legacy initializer has no verified reason for removal.

Run `python scripts/audit-branding.py --show-allowed` for every retained reference,
including file, line and justification. Exact-line exceptions with occurrence limits
live in `scripts/branding-allowlist.json`; legal/historical files are pinned by hash.



