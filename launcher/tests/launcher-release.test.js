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

test("launcher installation rechecks the latest release and opens only a verified installer", async () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/main.js"), "utf8");
  const start = source.indexOf("let launcherInstallRunning = false;");
  const end = source.indexOf("/** Preview-only:", start);
  const events = [];
  let update = { ...launcherReleaseState("0.2.8.1", manifest(), "win32", "x64"), checkFailed: true, message: "Offline" };
  const context = vm.createContext({
    path, RELEASES_URL, launchProcess: null, process: { platform: "win32", env: {} },
    checkLauncherUpdates: async () => { events.push("check"); return update; },
    emitActivity: () => {}, downloadFileWithProgress: () => {},
    downloadReleaseAsset: async (asset) => { events.push(`verified ${asset.version}`); return "Daisy-Setup.exe"; },
    shell: { openPath: async () => { events.push("open installer"); return ""; } },
    app: { getPath: () => os.tmpdir(), quit: () => events.push("quit") }
  });
  vm.runInContext(source.slice(start, end), context);
  const offline = await vm.runInContext("installLauncherUpdate()", context);
  assert.equal(offline.ok, false);
  assert.deepEqual(events, ["check"]);
  events.length = 0;
  update = launcherReleaseState("0.2.8.1", manifest(), "win32", "x64");
  const installed = await vm.runInContext("installLauncherUpdate()", context);
  assert.equal(installed.ok, true);
  assert.deepEqual(events, ["check", "verified 0.2.8.2", "open installer", "quit"]);
});

test("an explicit development manifest overrides beta channel discovery", async () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/main.js"), "utf8");
  const start = source.indexOf("async function fetchRemoteUpdateManifest() {");
  const end = source.indexOf("function resolveUpdateUrl(", start);
  const url = "https://example.invalid/latest.json";
  const requested = [];
  const context = vm.createContext({
    updateManifestUrl: url, process: { env: { DAISY_UPDATE_MANIFEST_URL: url } },
    readBuildVersion: () => "1.0.0-beta.1", launcherUserAgent: "test",
    AbortController, setTimeout, clearTimeout,
    fetch: async (target) => { requested.push(target); return { ok: true, json: async () => manifest("1.0.0-beta.2") }; }
  });
  vm.runInContext(source.slice(start, end), context);
  const remote = await vm.runInContext("fetchRemoteUpdateManifest()", context);
  assert.equal(remote.url, url);
  assert.deepEqual(requested, [url]);
});

test("stable 1.0 updates legacy and beta launchers and stops offering itself after upgrade", () => {
  const payload = manifest("1.0.0");
  for (const installed of ["0.2.8.4", "1.0.0-beta.3"]) {
    const state = launcherReleaseState(installed, payload, "win32", "x64");
    assert.equal(state.available, true);
    assert.equal(state.latestVersion, "1.0.0");
    assert.ok(state.asset);
  }
  assert.equal(launcherReleaseState("1.0.0", payload, "win32", "x64").available, false);
});

test("stable upgrade CLI rejects a missing prepared release tag before any network request", () => {
  const { spawnSync } = require("node:child_process");
  const result = spawnSync(process.execPath, [path.join(__dirname, "../scripts/verify-launcher-update.js")],
    { encoding: "utf8", env: { ...process.env, RELEASE_TAG: "" } });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /export RELEASE_TAG from the prepared workflow output/);
});
