const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const vm = require("node:vm");
const { RELEASES_URL, launcherReleaseState, downloadReleaseAsset } = require("../src/launcher-release.js");
const { newestClientJar } = require("../src/daisy-mod-cache.js");

const bytes = Buffer.from("test distribution bytes");
const digest = crypto.createHash("sha256").update(bytes).digest("hex");
function manifest(version = "0.2.8.2") {
  const payload = { version, minimumVersion: "0.1.7", required: false, files: {} };
  for (const [key, name] of Object.entries({ installer: "Daisy-Setup.exe", portable: "Daisy-Portable.exe", linux: "Daisy-Linux.tar.gz" })) {
    payload[`${key}Url`] = `${RELEASES_URL}/download/v${version}/${name}`;
    payload.files[key] = { name, size: bytes.length, sha256: digest };
  }
  return payload;
}

test("four-part versions offer a newer release and never downgrade", () => {
  assert.equal(launcherReleaseState("0.2.8.1", manifest(), "linux", "x64").available, true);
  assert.equal(launcherReleaseState("0.2.8.2", manifest(), "linux", "x64").available, false);
  assert.equal(launcherReleaseState("0.2.9.0", manifest(), "linux", "x64").available, false);
  assert.equal(launcherReleaseState("0.2.8.9", manifest("0.2.8.10"), "linux", "x64").available, true);
  assert.throws(() => launcherReleaseState("0.2.8.1", { version: "../../bad" }));
});

test("unsupported platforms and incomplete or foreign assets use the release page", () => {
  assert.equal(launcherReleaseState("0.2.8.1", manifest(), "linux", "arm64").asset, null);
  assert.equal(launcherReleaseState("0.2.8.1", manifest(), "darwin", "x64").asset, null);
  const bad = manifest();
  bad.linuxUrl = "https://example.invalid/Daisy-Linux.tar.gz";
  assert.equal(launcherReleaseState("0.2.8.1", bad, "linux", "x64").asset, null);
  bad.linuxUrl = manifest().linuxUrl;
  bad.files.linux.sha256 = "aa";
  assert.equal(launcherReleaseState("0.2.8.1", bad, "linux", "x64").asset, null);
});

test("mandatory updates only block when the offered version is newer", () => {
  const payload = { ...manifest(), required: true };
  assert.equal(launcherReleaseState("0.2.8.1", payload).blocking, true);
  assert.equal(launcherReleaseState("0.2.9.0", payload).blocking, false);
  payload.required = false;
  payload.minimumVersion = "0.2.8.2";
  assert.equal(launcherReleaseState("0.2.8.1", payload).required, true);
});

test("release downloads verify bytes, reuse verified files and remove corrupt partials", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "daisy-release-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const asset = launcherReleaseState("0.2.8.1", manifest(), "linux", "x64").asset;
  let downloads = 0;
  const download = async (url, target) => {
    assert.equal(url, asset.url);
    downloads++;
    fs.writeFileSync(target, bytes);
  };
  const file = await downloadReleaseAsset(asset, dir, download);
  assert.deepEqual(fs.readFileSync(file), bytes);
  await downloadReleaseAsset(asset, dir, download);
  assert.equal(downloads, 1);
  fs.writeFileSync(file, "bad");
  await assert.rejects(downloadReleaseAsset(asset, dir, async (_, target) => fs.writeFileSync(target, Buffer.alloc(bytes.length))), /SHA-256/);
  assert.equal(fs.existsSync(`${file}.partial`), false);
  await assert.rejects(downloadReleaseAsset({ ...asset, name: "../bad.exe" }, dir, download), /invalid/);
});

test("numeric client versions select a newer cache over an older bundle", () => {
  assert.equal(newestClientJar(["bundle/daisy-client-0.2.8.9+26.2.jar", "cache/daisy-client-0.2.8.10+26.2.jar"]), "cache/daisy-client-0.2.8.10+26.2.jar");
  assert.equal(newestClientJar(["cache/daisy-client-0.2.8.2+26.2.jar", "bundle/daisy-client-0.2.8.3+26.2.jar"]), "bundle/daisy-client-0.2.8.3+26.2.jar");
  assert.equal(newestClientJar([]), "");
});

test("launcher check uses the remote manifest and reports offline failure honestly", async () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/main.js"), "utf8");
  const start = source.indexOf("async function checkLauncherUpdates() {");
  const end = source.indexOf("async function fetchRemoteUpdateManifest()", start);
  let payload = manifest();
  const context = vm.createContext({ launcherReleaseState, readBuildVersion: () => "0.2.8.1", fetchRemoteUpdateManifest: async () => payload && ({ payload }) });
  vm.runInContext(`let updateCheckRunning = false; let launcherUpdateState = {available: false}; ${source.slice(start, end)}`, context);
  const offered = await vm.runInContext("checkLauncherUpdates()", context);
  assert.equal(offered.available, true);
  assert.equal(offered.asset.version, "0.2.8.2");
  payload = null;
  const offline = await vm.runInContext("checkLauncherUpdates()", context);
  assert.equal(offline.checkFailed, true);
  assert.equal(offline.available, true);
  assert.match(offline.message, /Could not check/);
});
