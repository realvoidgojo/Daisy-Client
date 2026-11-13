# Releasing

## Version and channel policy

The beta line starts at `1.0.0-beta.1`; subsequent betas increment the prerelease number.
The final `1.0.0` sorts after all its betas. Existing numeric four/five-part releases remain
comparable for upgrades. Beta releases are GitHub prereleases and never replace the
latest stable release. Beta launchers discover beta/stable candidates through GitHub's
release API; stable launchers use the latest stable manifest.

Prepare synchronized client, Electron and bootstrap versions:

```sh
python scripts/prepare-release.py 1.0.0 --launcher-version 1.0.0
```

The script updates Gradle, bootstrap, npm package/lock and build metadata. Add release
notes to `CHANGELOG.md`, review the diff and run the contribution checks. Release
manifests are generated from produced bytes, not maintained as handwritten URLs/hashes.

## Publish

Commit on the reviewed branch. Only after checks pass, create and push its matching tag:

```sh
git tag -a v1.0.0 -m "Daisy Client 1.0.0"
git push origin HEAD v1.0.0
```

The tag must match `daisyVersion`. Do not move existing tags or overwrite published
assets. Manual dispatch is also available for the selected ref and coordinated version.
The workflow rejects release collisions and runs full compatibility CI, then packages
Windows installer/portable and Linux tar distributions from the staged client/agent JARs.

`package-release.py collect` checks every Minecraft JAR and native package, emits
`latest.json` with per-file size/SHA-256, and writes `SHA256SUMS`. Publication starts as
a draft, becomes a prerelease or stable release as appropriate, and verifies the asset
inventory and uploaded digests. Real production-updater smoke checks download 1.21.11
and 26.2 JARs and test cache reuse, offline reuse and temporary-instance installation.
A failed post-publication check leaves the release visible and marks the workflow failed;
repair it through a new version rather than silently changing published bytes.

## Verification and responsibilities

```sh
python scripts/verify-release.py --tag v1.0.0
node launcher/scripts/verify-client-update.js v1.0.0 1.21.11
node launcher/scripts/verify-client-update.js v1.0.0 26.2
```

Use the corresponding source checkout. Record native installer, Linux runtime and
Minecraft session testing separately. Automated compilation/startup checks do not
certify every gameplay module. Optional Cloudflare publishing scripts are retained
for existing operators, require their own infrastructure/configuration, and are not
part of GitHub release publication.

Staging and collection also produce one deterministic standalone local-skin JAR per
Minecraft target from the compiled client. The manifest includes a separate `skins`
array, and publication verifies all 31 assets plus real skin downloads/cache/install
checks for 1.21.11 and 26.2. No opaque local skin binaries are release inputs.

## Stable launcher synchronization

A stable release must be published with `prerelease=false` and GitHub Latest pointing to
its tag. Existing stable launchers (including 0.2.8.4) consume
`https://github.com/realvoidgojo/Daisy-Client/releases/latest/download/latest.json`;
prereleases intentionally do not replace that endpoint. The source package/lock,
client/bootstrap and both build/update metadata files must agree on version and channel.
`prepare-release.py` synchronizes these files; `verify-project.py` rejects drift.

For stable tags, release verification checks both the GitHub Latest API and the public
stable manifest URL against the just-published immutable manifest, allowing a bounded
GitHub redirect/CDN propagation delay. The workflow then retrieves the pinned original
0.2.8.4 updater source and verifies discovery, update availability, a real Windows
package download, SHA-256 and cached reuse. It also checks that beta.3 sees the stable
upgrade and that the current installed version does not offer itself again. This smoke
check never executes an installer or modifies launcher settings/instances.

## Installed Windows update flow

The installed launcher streams byte progress into the activity UI, shows SHA-256
verification separately, and completes verified cache hits immediately. After a successful
verification it starts NSIS in silent update mode with automatic restart, targeting the
existing installation directory. A spawn failure leaves Daisy open with a retryable error.
Portable/Linux downloads retain their explicit replacement flow. An older installed
launcher still uses its old update UI for the transition to this release; subsequent
updates use the corrected flow.

Before publication the Windows package job silently installs into a temporary directory
and starts that installed executable with isolated smoke data. This integration check is
restricted to GitHub-hosted Windows runners so it cannot alter a developer's installation.
