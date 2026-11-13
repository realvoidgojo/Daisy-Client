// Client releases update independently of the launcher. Only exact Minecraft targets
// with verified release metadata enter the reusable download cache.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const { VERSION, compareVersions, clientJarIdentity } = require("./version.js");
const CLIENT_NAME = /^(?:daisy-client|clientcore)-(.+)\+(\d+(?:\.\d+)+)\.jar$/;
const SKIN_NAME = /^daisy-skin-(.+)\+(\d+(?:\.\d+)+)\.jar$/;
const artifactPattern = (kind) => {
  if (kind === "client") return CLIENT_NAME;
  if (kind === "skin") return SKIN_NAME;
  throw new Error("Unknown Daisy artifact kind.");
};

/** Accept only the exact Minecraft target and immutable assets in this repository. */
function pickDaisyModEntry(manifest, mcVersion, kind = "client") {
  const wanted = String(mcVersion || "").trim();
  if (!wanted || !VERSION.test(String(manifest?.version || ""))) return null;
  const list = kind === "skin" ? manifest?.skins : manifest?.mods;
  const mods = Array.isArray(list) ? list : [];
  const entries = mods.filter((mod) => mod && mod.minecraft === wanted);
  if (entries.length !== 1) return null;
  const entry = entries[0];
  const match = String(entry.name || "").match(artifactPattern(kind));
  if (!match || match[1] !== manifest.version || match[2] !== wanted
      || !/^[a-f0-9]{64}$/i.test(String(entry.sha256 || ""))
      || !Number.isSafeInteger(entry.size) || entry.size <= 0) return null;
  try {
    const url = new URL(entry.url);
    const expectedPath = `/realvoidgojo/Daisy-Client/releases/download/v${manifest.version}/${entry.name}`;
    if (url.origin !== "https://github.com" || url.username || url.password || url.search || url.hash
        || decodeURIComponent(url.pathname) !== expectedPath) return null;
  } catch { return null; }
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
function newestClientJar(candidates, kind = "client") {
  const version = (file) => path.basename(file).replace(/\.disabled$/, "").match(artifactPattern(kind))?.[1]
    || (kind === "client" && clientJarIdentity(path.basename(file))?.version)
    || path.basename(file).match(/^(?:daisy-client|clientcore)-([\d.]+)/)?.[1] || "0.0.0";
  return [...candidates].sort((a, b) => compareVersions(version(b), version(a)))[0] || "";
}

async function matchesEntry(file, entry) {
  try {
    return fs.statSync(file).size === entry.size && await fileMatchesSha256(file, entry.sha256);
  } catch { return false; }
}

/** Coalesce concurrent requests; receipts let offline launches recheck cached bytes. */
function createDaisyModUpdater(kind = "client") {
  const pattern = artifactPattern(kind);
  const manifestKey = kind === "skin" ? "skins" : "mods";
  const pending = new Map();
  async function update({ mcVersion, cacheDir, existingJar = "", fetchManifest, download, onDownload = () => {} }) {
    const cached = [];
    fs.mkdirSync(cacheDir, { recursive: true });
    for (const name of fs.readdirSync(cacheDir)) {
      const match = name.match(pattern);
      if (!match || match[2] !== mcVersion) continue;
      const file = path.join(cacheDir, name);
      try {
        const receipt = JSON.parse(fs.readFileSync(`${file}.verified.json`, "utf8"));
        const entry = pickDaisyModEntry({ version: receipt.version, [manifestKey]: [receipt] }, mcVersion, kind);
        if (entry && entry.name === name && await matchesEntry(file, entry)) cached.push(file);
      } catch { /* Unverified cache files are never launch candidates. */ }
    }
    const fallback = newestClientJar([...cached, existingJar].filter(Boolean), kind);
    const useFallback = (error) => ({ path: fallback, source: cached.includes(fallback) ? "cache" : fallback ? "bundled" : "unavailable", error });
    let partial = "";
    try {
      const remote = await fetchManifest();
      if (!remote) return useFallback(`Could not reach GitHub Releases; using a local ${kind} if available.`);
      const payload = remote.payload || remote;
      const entry = pickDaisyModEntry(payload, mcVersion, kind);
      if (!entry) return useFallback(`The latest release has no valid ${kind} for this Minecraft version.`);
      const target = path.join(cacheDir, entry.name);
      // A local development build or previously verified release can be newer.
      if (fallback && path.basename(fallback) !== entry.name
          && newestClientJar([target, fallback], kind) === fallback) return useFallback("");
      if (await matchesEntry(target, entry)) {
        fs.writeFileSync(`${target}.verified.json`, JSON.stringify({ ...entry, version: payload.version }));
        return { path: target, source: "cache", error: "" };
      }
      if (path.basename(existingJar) === entry.name && await matchesEntry(existingJar, entry)) {
        return { path: existingJar, source: "bundled", error: "" };
      }
      onDownload(entry);
      partial = `${target}.${crypto.randomUUID()}.partial`;
      await download(entry.url, partial, { totalBytes: entry.size });
      if (!(await matchesEntry(partial, entry))) throw new Error("Client download failed its size or SHA-256 check.");
      fs.renameSync(partial, target);
      fs.writeFileSync(`${target}.verified.json`, JSON.stringify({ ...entry, version: payload.version }));
      // Remove older cache entries only after the replacement and receipt are ready.
      for (const file of cached) {
        if (file === target) continue;
        try {
          fs.rmSync(file, { force: true });
          fs.rmSync(`${file}.verified.json`, { force: true });
        } catch { /* A running game may still hold an old JAR open. */ }
      }
      return { path: target, source: "download", error: "" };
    } catch (error) {
      return useFallback(error.message);
    } finally {
      if (partial) {
        fs.rmSync(partial, { force: true });
        fs.rmSync(`${partial}.download`, { force: true });
      }
    }
  }
  return function ensure(options) {
    const key = `${path.resolve(options.cacheDir)}:${options.mcVersion}`;
    if (!pending.has(key)) pending.set(key, update(options).finally(() => pending.delete(key)));
    return pending.get(key);
  };
}

/** Install a replacement before removing old clients; preserve explicit disablement. */
function installDaisyModJar(sourceJar, modsDir, mcVersion, kind = "client") {
  const pattern = artifactPattern(kind);
  const name = path.basename(sourceJar);
  const sourceMatch = name.match(pattern);
  if (!sourceMatch || sourceMatch[2] !== mcVersion) throw new Error("Client JAR does not match this Minecraft version.");
  fs.mkdirSync(modsDir, { recursive: true });
  const installed = fs.readdirSync(modsDir).filter((file) => {
    const name = file.replace(/\.disabled$/, "");
    const match = name.match(pattern);
    return match ? match[2] === mcVersion
      : kind === "client" && mcVersion === "1.21.11" && /^(?:daisy-client|clientcore)-\d+(?:\.\d+){2,4}\.jar$/.test(name);
  }).map((file) => path.join(modsDir, file));
  const latest = newestClientJar([sourceJar, ...installed], kind);
  if (latest !== sourceJar && path.basename(latest).replace(/\.disabled$/, "") !== name) {
    return { path: latest, disabled: latest.endsWith(".disabled"), removed: [] };
  }
  const disabled = installed.some((file) => file.endsWith(".disabled"));
  const target = path.join(modsDir, name + (disabled ? ".disabled" : ""));
  const targetExisted = fs.existsSync(target);
  const partial = `${target}.${crypto.randomUUID()}.install`;
  const digest = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  try {
    if (!fs.existsSync(target) || digest(target) !== digest(sourceJar)) {
      fs.copyFileSync(sourceJar, partial);
      fs.renameSync(partial, target);
    }
  } finally { fs.rmSync(partial, { force: true }); }
  const removed = [];
  for (const file of installed) {
    if (file === target) continue;
    try {
      fs.rmSync(file, { force: true });
    } catch (error) {
      // Avoid leaving two active versions when Windows holds the old JAR open.
      if (!targetExisted) fs.rmSync(target, { force: true });
      throw error;
    }
    removed.push(path.basename(file));
  }
  return { path: target, disabled, removed };
}

// Older stable launchers only understand numeric filenames. Keep beta downloads
// out of their cache so they cannot mistake a beta JAR for another Minecraft target.
function clientCacheDirectory(userData, version) {
  return path.join(userData, version.includes("-") ? "daisy-mod-cache-beta" : "daisy-mod-cache");
}

module.exports = { pickDaisyModEntry, sha256File, fileMatchesSha256, newestClientJar, createDaisyModUpdater, installDaisyModJar, clientCacheDirectory };
