const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const vm = require("node:vm");
const { RELEASES_URL, launcherReleaseState, downloadReleaseAsset, startWindowsInstaller } = require("../src/launcher-release.js");
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

test("launcher installation reports progress, verifies, then hands off silently before quitting", async () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/main.js"), "utf8");
  const start = source.indexOf("let launcherInstallRunning = false;");
  const end = source.indexOf("/** Preview-only:", start);
  const events = [];
  const activities = [];
  let handoffFails = false;
  let update = { ...launcherReleaseState("0.2.8.1", manifest(), "win32", "x64"), checkFailed: true, message: "Offline" };
  const context = vm.createContext({
    path, RELEASES_URL, launchProcess: null, process: { platform: "win32", env: {} },
    checkLauncherUpdates: async () => { events.push("check"); return update; },
    emitActivity: event => activities.push(event), downloadFileWithProgress: () => {},
    formatBytes: value => `${value} B`, formatDuration: value => `${value}s`,
    setTimeout: callback => { callback(); }, spawn: () => {},
    downloadReleaseAsset: async (asset, directory, download, callbacks) => {
      callbacks.onProgress({ downloaded: 10, total: asset.size, speed: 5, eta: 3 });
      callbacks.onVerifying();
      events.push(`verified ${asset.version}`); return path.join(os.tmpdir(), "Daisy-Setup.exe");
    },
    startWindowsInstaller: async () => { events.push("silent installer"); if (handoffFails) throw new Error("Cannot start installer"); },
    shell: {},
    app: { isPackaged: true, getPath: name => name === "exe" ? path.join(os.tmpdir(), "Daisy", "Daisy.exe") : os.tmpdir(), quit: () => events.push("quit") }
  });
  vm.runInContext(source.slice(start, end), context);
  const offline = await vm.runInContext("installLauncherUpdate()", context);
  assert.equal(offline.ok, false);
  assert.deepEqual(events, ["check"]);
  events.length = 0;
  update = launcherReleaseState("0.2.8.1", manifest(), "win32", "x64");
  const installed = await vm.runInContext("installLauncherUpdate()", context);
  assert.equal(installed.ok, true);
  assert.deepEqual(events, ["check", "verified 0.2.8.2", "silent installer", "quit"]);
  assert.ok(activities.some(event => event.title === "Downloading update" && event.percent > 0 && event.percent < 100));
  assert.ok(activities.some(event => event.title === "Verifying update"));
  assert.ok(activities.some(event => event.title === "Update verified" && event.percent === 100));
  events.length = 0;
  handoffFails = true;
  assert.equal((await vm.runInContext("installLauncherUpdate()", context)).ok, false);
  assert.ok(!events.includes("quit"));
  assert.equal(activities.at(-1).error, true);
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


test("release downloads forward live byte progress and cached downloads finish at 100 percent", async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "daisy-progress-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const asset = launcherReleaseState("0.2.8.1", manifest(), "win32", "x64").asset;
  const progress = [], phases = [];
  const options = { onProgress: value => progress.push(value), onVerifying: () => phases.push("verify") };
  await downloadReleaseAsset(asset, directory, async (_url, target, downloadOptions) => {
    assert.equal(downloadOptions.totalBytes, bytes.length);
    downloadOptions.onProgress({ downloaded: 5, total: bytes.length, speed: 10, eta: 2 });
    fs.writeFileSync(target, bytes);
    downloadOptions.onProgress({ downloaded: bytes.length, total: bytes.length, speed: 10, eta: 0 });
  }, options);
  assert.equal(progress[0].downloaded, 5);
  assert.equal(progress.at(-1).downloaded, bytes.length);
  assert.deepEqual(phases, ["verify"]);
  progress.length = 0;
  await downloadReleaseAsset(asset, directory, async () => { throw new Error("Cached update downloaded again"); }, options);
  assert.equal(progress.length, 1);
  assert.equal(progress[0].cached, true);
  assert.equal(progress[0].downloaded, progress[0].total);
});

test("Windows update handoff uses silent NSIS update flags and reports launch errors", async () => {
  const { EventEmitter } = require("node:events");
  const target = path.join(os.tmpdir(), "Daisy-Setup.exe"), directory = path.join(os.tmpdir(), "Daisy Launcher");
  let detached = false;
  await startWindowsInstaller(target, directory, (file, args, options) => {
    assert.equal(file, target);
    assert.deepEqual(args, ["--updated", "/S", "--force-run", `/D=${directory}`]);
    assert.equal(options.windowsHide, true); assert.equal(options.detached, true);
    assert.equal(options.shell, false); assert.equal(options.windowsVerbatimArguments, false);
    const child = new EventEmitter(); child.unref = () => { detached = true; };
    queueMicrotask(() => child.emit("spawn")); return child;
  });
  assert.equal(detached, true);
  await assert.rejects(startWindowsInstaller(target, directory, () => {
    const child = new EventEmitter(); child.unref = () => {};
    queueMicrotask(() => child.emit("error", new Error("Access denied"))); return child;
  }), /Access denied/);
  await assert.rejects(startWindowsInstaller("unverified.exe", directory, () => { throw new Error("Should not spawn"); }), /Invalid verified/);
  await assert.rejects(startWindowsInstaller(target, `${directory}\ncommand`, () => { throw new Error("Should not spawn"); }), /Invalid verified/);
  const literalDirectory = path.join(os.tmpdir(), "Daisy & literal $(command)");
  await startWindowsInstaller(target, literalDirectory, (file, args, options) => {
    assert.equal(file, target);
    assert.equal(args.at(-1), `/D=${literalDirectory}`);
    assert.equal(options.shell, false);
    const child = new EventEmitter(); child.unref = () => {};
    queueMicrotask(() => child.emit("spawn")); return child;
  });
});
