// Prove the installed 0.2.8.4 updater can discover and download a new stable release.
// Fetches artifacts into temporary state only; never executes an installer.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { execFileSync } = require("node:child_process");
const { Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const current = require("../src/launcher-release.js");
const LEGACY_COMMIT = "34075f782555e2bced6d7165e282ce2a2b05fd75";
function historicalModule(name, dependencies = {}) {
  const source = execFileSync("git", ["show", `${LEGACY_COMMIT}:launcher/src/${name}`], { encoding: "utf8" });
  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports, Buffer, URL, process,
    require: id => dependencies[id] || require(id) }, { filename: name });
  return module.exports;
}
async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(180000),
    headers: { "User-Agent": "Daisy-Stable-Upgrade-Verification", "Cache-Control": "no-cache" } });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  return response;
}
async function main() {
  const [tag] = process.argv.slice(2);
  assert.match(tag || "", /^v\d+\.\d+\.\d+$/);
  const legacyCache = historicalModule("daisy-mod-cache.js");
  const legacy = historicalModule("launcher-release.js", { "./daisy-mod-cache.js": legacyCache });
  const payload = await (await get("https://github.com/realvoidgojo/Daisy-Client/releases/latest/download/latest.json")).json();
  assert.equal(payload.version, tag.slice(1), "Installed launchers still see a different stable manifest");
  for (const entry of payload.mods) {
    assert.ok(legacyCache.pickDaisyModEntry(payload, entry.minecraft), `Legacy client updater rejected ${entry.name}`);
  }
  const oldState = legacy.launcherReleaseState("0.2.8.4", payload, "win32", "x64");
  assert.equal(oldState.available, true);
  assert.equal(oldState.latestVersion, tag.slice(1));
  assert.ok(oldState.asset, "Legacy updater must offer a usable Windows download");
  assert.equal(current.launcherReleaseState("1.0.0-beta.3", payload, "win32", "x64").available, true);
  assert.equal(current.launcherReleaseState(payload.version, payload, "win32", "x64").available, false);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "daisy-stable-upgrade-"));
  try {
    let downloads = 0;
    const file = await legacy.downloadReleaseAsset(oldState.asset, root, async (url, target) => {
      downloads++;
      await pipeline(Readable.fromWeb((await get(url)).body), fs.createWriteStream(target));
    });
    assert.equal(fs.statSync(file).size, oldState.asset.size);
    assert.equal(await legacy.downloadReleaseAsset(oldState.asset, root, async () => { throw new Error("Cache was not reused"); }), file);
    assert.equal(downloads, 1);
    console.log(`Verified installed 0.2.8.4 → ${payload.version}: GitHub Latest discovery, update available, real Windows download, SHA-256 and cache reuse. Installer was not executed.`);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
