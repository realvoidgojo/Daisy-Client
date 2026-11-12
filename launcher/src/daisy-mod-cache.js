// Daisy's own mod jar for one Minecraft version. The launcher ships only the jar for its default
// version; every other version is fetched from the update server the first time an instance
// needs it, checked against the SHA-256 in the release manifest, and kept in a cache folder.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

/** The manifest entry for [mcVersion], or null when this release has no Daisy build for it. */
function pickDaisyModEntry(manifest, mcVersion) {
  const mods = Array.isArray(manifest?.mods) ? manifest.mods : [];
  const wanted = String(mcVersion || "").trim();
  if (!wanted) return null;
  const entry = mods.find((mod) => mod && String(mod.minecraft || "").trim() === wanted);
  if (!entry || !entry.url || !entry.name || !entry.sha256) return null;
  // Only ever a plain clientcore jar name: the cache file name comes from the manifest.
  if (!/^(?:daisy-client|clientcore)-[\w.+-]+\.jar$/i.test(String(entry.name))) return null;
  return entry;
}

/** SHA-256 of a file's contents, read in pieces. */
function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    fs.createReadStream(filePath)
      .on("error", reject)
      .on("data", (chunk) => hash.update(chunk))
      .on("end", () => resolve(hash.digest("hex")));
  });
}

/** True when [filePath] exists and its SHA-256 is [expected]. */
async function fileMatchesSha256(filePath, expected) {
  try {
    return (await sha256File(filePath)) === String(expected || "").toLowerCase();
  } catch {
    return false;
  }
}

// Callers already filter for the instance's exact Minecraft version. Compare the
// Daisy version so a bundled older JAR cannot hide a freshly downloaded release.
function newestClientJar(candidates) {
  const version = (file) => (path.basename(file).match(/^(?:daisy-client|clientcore)-([\d.]+)/i)?.[1] || "0").split(".").map(Number);
  return [...candidates].sort((left, right) => {
    const a = version(left), b = version(right);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const diff = (b[i] || 0) - (a[i] || 0);
      if (diff) return diff;
    }
    return 0;
  })[0] || "";
}

module.exports = { pickDaisyModEntry, sha256File, fileMatchesSha256, newestClientJar };
