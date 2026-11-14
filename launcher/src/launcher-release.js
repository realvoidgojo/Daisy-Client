const fs = require("node:fs");
const path = require("node:path");
const { fileMatchesSha256 } = require("./daisy-mod-cache.js");

const RELEASES_URL = "https://github.com/realvoidgojo/Daisy-Client/releases";
const { VERSION, compareVersions } = require("./version.js");

function releaseAsset(payload, platform, arch = process.arch) {
  if (!VERSION.test(String(payload?.version || "")) || arch !== "x64") return null;
  const portable = platform === "win32" && Boolean(process.env.PORTABLE_EXECUTABLE_FILE);
  const key = platform === "linux" ? "linux" : platform === "win32" ? (portable ? "portable" : "installer") : "";
  const names = { installer: "Daisy-Setup.exe", portable: "Daisy-Portable.exe", linux: "Daisy-Linux.tar.gz" };
  const file = payload?.files?.[key];
  if (!file || file.name !== names[key] || !/^[a-f0-9]{64}$/i.test(String(file.sha256 || ""))
      || !Number.isSafeInteger(file.size) || file.size <= 0) return null;
  // Executables must come from this project's versioned GitHub release, even when
  // the manifest location is overridden for testing or a private mirror.
  const expected = `${RELEASES_URL}/download/v${payload.version}/${file.name}`;
  if (payload[`${key}Url`] !== expected) return null;
  return { ...file, url: expected, version: payload.version };
}

function launcherReleaseState(currentVersion, payload, platform = process.platform, arch = process.arch) {
  if (!VERSION.test(String(payload?.version || ""))) throw new Error("Release manifest has no valid Daisy version.");
  const available = compareVersions(payload.version, currentVersion) > 0;
  const asset = releaseAsset(payload, platform, arch);
  const minimumVersion = VERSION.test(String(payload.minimumVersion || "")) ? payload.minimumVersion : "";
  const required = available && (payload.required === true || Boolean(minimumVersion && compareVersions(currentVersion, minimumVersion) < 0));
  return {
    checkedAt: Date.now(), currentVersion, latestVersion: payload.version, minimumVersion,
    available, required, blocking: required, checkFailed: false,
    url: `${RELEASES_URL}/tag/v${payload.version}`, asset,
    message: available ? `Daisy Client ${payload.version} is available.` : "Daisy is up to date."
  };
}

async function downloadReleaseAsset(asset, directory, download, { onProgress = () => {}, onVerifying = () => {} } = {}) {
  // Revalidate at the filesystem boundary; never accept a manifest path as a filename.
  if (!asset || !VERSION.test(asset.version)
      || !["Daisy-Setup.exe", "Daisy-Portable.exe", "Daisy-Linux.tar.gz"].includes(asset.name)
      || asset.url !== `${RELEASES_URL}/download/v${asset.version}/${asset.name}`
      || !/^[a-f0-9]{64}$/i.test(asset.sha256) || !Number.isSafeInteger(asset.size) || asset.size <= 0) {
    throw new Error("Release download metadata is invalid.");
  }
  fs.mkdirSync(directory, { recursive: true });
  const target = path.join(directory, asset.name);
  const matches = async (file) => fs.existsSync(file) && fs.statSync(file).size === asset.size && await fileMatchesSha256(file, asset.sha256);
  if (fs.existsSync(target)) {
    onVerifying();
    if (await matches(target)) {
      onProgress({ downloaded: asset.size, total: asset.size, speed: 0, eta: 0, cached: true });
      return target;
    }
  }
  const partial = `${target}.partial`;
  try {
    await download(asset.url, partial, { totalBytes: asset.size, onProgress });
    onVerifying();
    if (!(await matches(partial))) throw new Error("Release download failed its size or SHA-256 check. Nothing was opened.");
    fs.rmSync(target, { force: true });
    fs.renameSync(partial, target);
    return target;
  } finally {
    fs.rmSync(partial, { force: true });
    fs.rmSync(`${partial}.download`, { force: true });
  }
}

// NSIS update flags match electron-builder's updater contract. /D must be last.
// Only main's verified download handoff calls this function. The executable has a
// fixed asset name and GitHub repository URL, and its size/SHA-256 are checked by
// downloadReleaseAsset. Paths and arguments are passed directly, without a shell.
function startWindowsInstaller(target, installDirectory, spawnProcess) {
  if (typeof target !== "string" || typeof installDirectory !== "string" || /[\x00-\x1f"]/.test(target + installDirectory)
      || !path.isAbsolute(target) || path.basename(target) !== "Daisy-Setup.exe" || !path.isAbsolute(installDirectory)) {
    return Promise.reject(new Error("Invalid verified installer location."));
  }
  return new Promise((resolve, reject) => {
    const child = spawnProcess(target, ["--updated", "/S", "--force-run", `/D=${installDirectory}`], {
      detached: true, stdio: "ignore", windowsHide: true, shell: false, windowsVerbatimArguments: false
    });
    child.once("error", reject);
    child.once("spawn", () => { child.unref(); resolve(); });
  });
}

module.exports = { RELEASES_URL, compareVersions, releaseAsset, launcherReleaseState, downloadReleaseAsset, startWindowsInstaller };
