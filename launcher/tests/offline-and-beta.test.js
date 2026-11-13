const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const vm = require("node:vm");
const { VERSION, compareVersions, clientJarIdentity, latestChannelRelease } = require("../src/version.js");
const { cachedMetadata } = require("../src/metadata-cache.js");
const { pickDaisyModEntry } = require("../src/daisy-mod-cache.js");

test("beta ordering preserves stable and legacy update compatibility", () => {
  assert.ok(VERSION.test("1.0.0-beta.1"));
  assert.ok(compareVersions("1.0.0-beta.10", "1.0.0-beta.2") > 0);
  assert.ok(compareVersions("1.0.0", "1.0.0-beta.10") > 0);
  assert.ok(compareVersions("1.0.0-beta.1", "0.2.8.4") > 0);
  assert.deepEqual(clientJarIdentity("daisy-client-1.0.0-beta.1+26.2.jar"), { version: "1.0.0-beta.1", minecraft: "26.2" });
  const releases = [{ tag_name: "v1.0.0-beta.1", prerelease: true }, { tag_name: "v0.2.8.4", prerelease: false }];
  assert.equal(latestChannelRelease(releases).tag_name, "v0.2.8.4");
  assert.equal(latestChannelRelease(releases, true).tag_name, "v1.0.0-beta.1");
  const name = "daisy-client-1.0.0-beta.1+26.2.jar";
  assert.ok(pickDaisyModEntry({ version: "1.0.0-beta.1", mods: [{ minecraft: "26.2", name,
    size: 1, sha256: "a".repeat(64), url: `https://github.com/realvoidgojo/Daisy-Client/releases/download/v1.0.0-beta.1/${name}` }] }, "26.2"));
});

test("cached game metadata works without contacting a network service", async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "daisy-metadata-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const url = "https://meta.fabricmc.net/v2/versions/loader/test";
  const payload = { mainClass: "example.Main" };
  assert.deepEqual(await cachedMetadata(url, directory, async () => payload), payload);
  assert.deepEqual(await cachedMetadata(url, directory, async () => { throw new Error("offline"); }), payload);
  const newer = { mainClass: "example.NewMain" };
  assert.deepEqual(await cachedMetadata(url, directory, async () => newer, true), newer);
  const file = path.join(directory, fs.readdirSync(directory)[0]);
  fs.writeFileSync(file, "corrupt JSON");
  await assert.rejects(cachedMetadata(url, directory, async () => { throw new Error("offline"); }), /offline/);
});

test("local account readiness does not call Microsoft or require ownership services", async () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/main.js"), "utf8");
  const start = source.indexOf("async function ensureFreshAuth() {");
  const end = source.indexOf('ipcMain.handle("launcher:set-offline-account"', start);
  let localCreated = false;
  const context = vm.createContext({
    readAuth: () => ({}), readSettings: () => ({ offlineName: "LocalPlayer" }),
    setOfflineAccount: (name) => { localCreated = true; return { profile: { name } }; }
  });
  vm.runInContext(source.slice(start, end), context);
  assert.equal((await vm.runInContext("ensureFreshAuth()", context)).profile.name, "LocalPlayer");
  assert.equal(localCreated, true);
  assert.doesNotMatch(source, /async function requestMicrosoftDeviceCode|async function assertMinecraftOwnership/);
});

test("smoke mode isolates shared app data as well as settings and Chromium state", () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/main.js"), "utf8");
  const start = source.indexOf("const smokeTest =");
  const end = source.indexOf('const { spawn }', start);
  const paths = {};
  vm.runInNewContext(source.slice(start, end), {
    app: { setPath: (name, value) => { paths[name] = value; }, disableHardwareAcceleration: () => {} },
    process: { argv: ["--smoke-test"], env: { DAISY_SMOKE_TEST: "1", DAISY_SMOKE_DIR: "isolated" } }
  });
  assert.deepEqual(paths, { appData: "isolated", userData: "isolated", sessionData: "isolated" });
});

test("beta downloads cannot enter the cache scanned by older stable launchers", () => {
  const { clientCacheDirectory } = require("../src/daisy-mod-cache.js");
  assert.equal(path.basename(clientCacheDirectory("data", "0.2.8.4")), "daisy-mod-cache");
  assert.notEqual(clientCacheDirectory("data", "1.0.0-beta.2"), clientCacheDirectory("data", "0.2.8.4"));
});
