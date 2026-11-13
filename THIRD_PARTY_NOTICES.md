# License and attribution

Daisy project source and newly authored geometric artwork are MIT licensed under
[LICENSE](LICENSE). This does not relicense third-party dependencies, fonts, icons,
Minecraft, installed mods or public certificate data. Original client source authorship
remains credited in Fabric metadata.

## Included assets

- Exo 2 and Montserrat fonts: SIL Open Font License 1.1. Embedded font family/license
  metadata was inspected; copyright and full terms are retained in
  `src/client/resources/FONTS-LICENSE.txt`.
- Press Start 2P: SIL OFL 1.1, copyright 2012 The Press Start 2P Project Authors.
  The original provenance notice and complete `launcher/src/assets/fonts/OFL.txt` ship
  with the launcher. Sources: Google Fonts' `ofl/exo2`, `ofl/montserrat`, `ofl/pressstart2p`.
- Lucide raster icons: ISC, with Feather/MIT portions identified in
  `src/client/resources/ICONS-LICENSE.txt`. Source: https://lucide.dev/license.
- Original replacement artwork: generated from `assets/artwork.json` by
  `scripts/generate-assets.py`, using geometric primitives and the included OFL font
  for title lettering. No third-party game screenshots or proprietary OS fonts are used.
- Original rotation-only skin-viewer rig: MIT; no third-party embedded texture.
- The Gradle wrapper JAR: Apache-2.0; https://github.com/gradle/gradle/blob/master/LICENSE.
- The existing public certificate is compatibility identity data, not a new Daisy signing
  identity. No private signing material is distributed.

Every versioned binary asset has a path, source, applicable license/notice and SHA-256 in
`assets/licenses.json`. New or changed assets require review; CI rejects missing records.
The inventory records provenance evidence, not an independent legal determination.

The full Apache-2.0 text is included in `licenses/Apache-2.0.txt` and copied into
client/agent metadata and the launcher distribution. Kotlin/JetBrains notices are
also retained in `licenses/` from their upstream sources.

## Java and Minecraft dependencies

Fabric Loader and Fabric API use Apache-2.0; Fabric Language Kotlin and Kotlin use
Apache-2.0. Fabric Loom uses MIT; Stonecutter uses GNU LGPL v3 (https://github.com/stonecutter-versioning/stonecutter/blob/display/LICENSE) as a build plugin. Consult their upstream distributions for complete notices. Gradle/Java tools
and Minecraft itself are not relicensed by this project.

Minecraft game assets/libraries are obtained separately through Mojang metadata and
remain subject to https://www.minecraft.net/eula. The client JAR does not bundle the
game. Names used to describe compatibility do not imply Mojang/Microsoft endorsement.

Development/runtime optimization mods are independent downloads, not code owned by
Daisy: Sodium (PolyForm Shield), Lithium (LGPL-3.0), FerriteCore (MIT), and ImmediatelyFast
(LGPL-3.0-or-later). Project metadata/source links reviewed for this audit are recorded
in `docs/dependency-licenses.json`. Their exact downloaded versions retain upstream
terms; not all optional mods are permissively licensed or OSI open source.

## npm and native launcher distribution

The lockfile contains license metadata for every resolved npm package. React/Radix are
MIT; Lucide is ISC; Electron is MIT with Chromium/BSD and many separately licensed
components. Build/packaging tools also contain LGPL, MPL and other license expressions;
this repository does not describe every dependency as MIT or permissive.

`launcher/scripts/build-app.js` inventories installed production dependencies, copies
available license/notice texts and writes `app/DEPENDENCY-LICENSES.json`. Native Electron
packaging retains Electron/Chromium distribution notices. Root MIT and third-party
notices are copied into client/agent metadata and the application. An npm metadata
check does not replace the actual upstream license text in a distribution.

Opaque optional skin/authentication-agent binaries and unverified external artwork are excluded from official
releases. User-imported skins, worlds, packs and mods remain the user's own materials.
