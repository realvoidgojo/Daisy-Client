const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { pickDaisyModEntry, sha256File, fileMatchesSha256 } = require("../src/daisy-mod-cache.js");

const digest = crypto.createHash("sha256").update("client bytes").digest("hex");
const entry = (mc = "26.2", version = "0.2.8.3") => ({
  minecraft: mc, name: `daisy-client-${version}+${mc}.jar`,
  url: `https://github.com/realvoidgojo/Daisy-Client/releases/download/v${version}/daisy-client-${version}%2B${mc}.jar`,
  size: Buffer.byteLength("client bytes"), sha256: digest
});
const manifest = { version: "0.2.8.3", mods: [entry("1.21.11"), entry()] };

test("picks the entry for the exact Minecraft version", () => {
  assert.equal(pickDaisyModEntry(manifest, "26.2").name, "daisy-client-0.2.8.3+26.2.jar");
  assert.equal(pickDaisyModEntry(manifest, " 1.21.11 ").name, "daisy-client-0.2.8.3+1.21.11.jar");
});

test("no entry for a version this release does not build for", () => {
  assert.equal(pickDaisyModEntry(manifest, "1.21.9"), null);
  assert.equal(pickDaisyModEntry(manifest, ""), null);
  assert.equal(pickDaisyModEntry(undefined, "1.21.11"), null);
  assert.equal(pickDaisyModEntry({ mods: "x" }, "1.21.11"), null);
});

test("an entry without a checksum or a usable name is ignored", () => {
  const bad = { version: "0.2.8.3", mods: [
    { minecraft: "1.21.4", name: "daisy-client-0.2.8.3+1.21.4.jar", url: "https://x/c.jar" },
    { minecraft: "1.21.5", name: "../../evil.jar", url: "https://x/d.jar", sha256: "cc" }
  ] };
  assert.equal(pickDaisyModEntry(bad, "1.21.4"), null);
  assert.equal(pickDaisyModEntry(bad, "1.21.5"), null);
});

test("sha256 of a file matches crypto's own answer, and a wrong hash is rejected", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "daisy-cache-test-"));
  const file = path.join(dir, "x.jar");
  const data = crypto.randomBytes(3 * 1024 * 1024 + 17);
  fs.writeFileSync(file, data);
  const expected = crypto.createHash("sha256").update(data).digest("hex");
  assert.equal(await sha256File(file), expected);
  assert.equal(await fileMatchesSha256(file, expected), true);
  assert.equal(await fileMatchesSha256(file, expected.replace(/.$/, (c) => (c === "0" ? "1" : "0"))), false);
  assert.equal(await fileMatchesSha256(path.join(dir, "missing.jar"), expected), false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("rejects wrong targets, hashes, sizes, duplicate targets and foreign release URLs", () => {
  for (const overrides of [
    { name: "../daisy-client-bad.jar" }, { name: "daisy-client-0.2.8.3+1.21.11.jar" },
    { name: "daisy-client-0.2.8.2+26.2.jar" }, { sha256: "aa" }, { size: -1 },
    { url: "https://example.invalid/mod.jar" },
    { url: entry().url.replace("/v0.2.8.3/", "/v0.2.8.2/") },
    { url: entry().url + "?download=1" }
  ]) assert.equal(pickDaisyModEntry({ ...manifest, mods: [{ ...entry(), ...overrides }] }, "26.2"), null);
  assert.equal(pickDaisyModEntry({ ...manifest, mods: [entry(), entry()] }, "26.2"), null);
});

const { createDaisyModUpdater, installDaisyModJar } = require("../src/daisy-mod-cache.js");
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "daisy-update-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const cacheDir = path.join(dir, "cache");
  const existingJar = path.join(dir, "daisy-client-0.2.8.2+26.2.jar");
  fs.writeFileSync(existingJar, "old bundled client");
  let downloads = 0;
  const options = { mcVersion: "26.2", cacheDir, existingJar,
    fetchManifest: async () => ({ payload: manifest }),
    download: async (url, target) => { downloads++; assert.equal(url, entry().url); fs.writeFileSync(target, "client bytes"); }
  };
  return { dir, options, downloads: () => downloads };
}

test("downloads the newer exact target once, coalesces requests and verifies the cache offline", async (t) => {
  const f = fixture(t), ensure = createDaisyModUpdater();
  const [first, second] = await Promise.all([ensure(f.options), ensure(f.options)]);
  assert.equal(first.path, second.path);
  assert.equal(first.source, "download");
  assert.equal(f.downloads(), 1);
  assert.equal(fs.readFileSync(first.path, "utf8"), "client bytes");
  assert.equal((await ensure(f.options)).source, "cache");
  assert.equal(f.downloads(), 1);
  // A new process must be able to verify and use the receipt without the network.
  const offline = await createDaisyModUpdater()({ ...f.options, fetchManifest: async () => null });
  assert.equal(offline.path, first.path);
  assert.equal(offline.source, "cache");
});

test("corrupt cache and bad downloads never replace the working client", async (t) => {
  const f = fixture(t), ensure = createDaisyModUpdater();
  const first = await ensure(f.options);
  fs.writeFileSync(first.path, "corrupt data");
  const offline = await ensure({ ...f.options, fetchManifest: async () => { throw new Error("offline"); } });
  assert.equal(offline.path, f.options.existingJar);
  const failed = await ensure({ ...f.options, download: async (_, target) => fs.writeFileSync(target, "bad download") });
  assert.equal(failed.path, f.options.existingJar);
  assert.match(failed.error, /SHA-256/);
  assert.equal(fs.readdirSync(f.options.cacheDir).some((name) => /partial|download$/.test(name)), false);
  assert.equal(fs.readFileSync(f.options.existingJar, "utf8"), "old bundled client");
  const repaired = await ensure(f.options);
  assert.equal(fs.readFileSync(repaired.path, "utf8"), "client bytes");
});

test("missing builds use local fallback, never another Minecraft target or a downgrade", async (t) => {
  const f = fixture(t), ensure = createDaisyModUpdater();
  const unavailable = await ensure({ ...f.options, mcVersion: "1.21.9", existingJar: "" });
  assert.equal(unavailable.path, "");
  assert.equal(f.downloads(), 0);
  const first = await ensure(f.options);
  const older = { version: "0.2.8.2", mods: [entry("26.2", "0.2.8.2")] };
  const result = await ensure({ ...f.options, fetchManifest: async () => ({ payload: older }) });
  assert.equal(result.path, first.path);
  assert.equal(f.downloads(), 1);
});

test("a bundled copy matching the published checksum avoids a redundant download", async (t) => {
  const f = fixture(t);
  const existingJar = path.join(f.dir, entry().name);
  fs.writeFileSync(existingJar, "client bytes");
  const result = await createDaisyModUpdater()({ ...f.options, existingJar });
  assert.equal(result.path, existingJar);
  assert.equal(result.source, "bundled");
  assert.equal(f.downloads(), 0);
});

test("instance installation updates atomically, preserves disabled state and repairs changed bytes", (t) => {
  const f = fixture(t), mods = path.join(f.dir, "mods");
  fs.mkdirSync(mods);
  const old = path.join(mods, path.basename(f.options.existingJar) + ".disabled");
  fs.copyFileSync(f.options.existingJar, old);
  const source = path.join(f.dir, entry().name);
  fs.writeFileSync(source, "client bytes");
  const result = installDaisyModJar(source, mods, "26.2");
  assert.equal(result.disabled, true);
  assert.equal(result.path.endsWith(".jar.disabled"), true);
  assert.equal(fs.existsSync(old), false);
  fs.writeFileSync(result.path, "tampered jar");
  installDaisyModJar(source, mods, "26.2");
  assert.equal(fs.readFileSync(result.path, "utf8"), "client bytes");
  assert.equal(installDaisyModJar(f.options.existingJar, mods, "26.2").path, result.path);
  assert.throws(() => installDaisyModJar(source, mods, "1.21.11"), /does not match/);
  const newer = path.join(f.dir, "daisy-client-0.2.8.4+26.2.jar");
  assert.throws(() => installDaisyModJar(newer, mods, "26.2"));
  assert.equal(fs.readFileSync(result.path, "utf8"), "client bytes");
});

test("legacy disabled instances keep their choice when moving to versioned clients", (t) => {
  const f = fixture(t), mods = path.join(f.dir, "mods");
  fs.mkdirSync(mods);
  const legacy = path.join(mods, "clientcore-0.2.7.jar.disabled");
  fs.writeFileSync(legacy, "old client");
  const source = path.join(f.dir, entry("1.21.11").name);
  fs.writeFileSync(source, "client bytes");
  const result = installDaisyModJar(source, mods, "1.21.11");
  assert.equal(result.disabled, true);
  assert.equal(fs.existsSync(legacy), false);
});

test("a locked old client leaves the working installation without a duplicate replacement", (t) => {
  const f = fixture(t), mods = path.join(f.dir, "mods");
  fs.mkdirSync(mods);
  const old = path.join(mods, path.basename(f.options.existingJar));
  fs.copyFileSync(f.options.existingJar, old);
  const source = path.join(f.dir, entry().name);
  fs.writeFileSync(source, "client bytes");
  const remove = fs.rmSync;
  const mocked = t.mock.method(fs, "rmSync", (file, options) => {
    if (file === old) throw new Error("JAR is locked");
    return remove(file, options);
  });
  assert.throws(() => installDaisyModJar(source, mods, "26.2"), /locked/);
  assert.deepEqual(fs.readdirSync(mods), [path.basename(old)]);
  mocked.mock.restore();
});

test("the Electron runtime resolver selects versions over timestamps and excludes source JARs", (t) => {
  const { newestClientJar } = require("../src/daisy-mod-cache.js");
  const vm = require("node:vm");
  const f = fixture(t), bundled = path.join(f.dir, "bundled");
  fs.mkdirSync(bundled);
  for (const name of ["daisy-client-0.2.8.2+1.21.11.jar", "daisy-client-0.2.8.3+1.21.11.jar",
    "daisy-client-0.2.9+1.21.11-sources.jar", "daisy-client-0.2.9+26.2.jar"]) {
    fs.writeFileSync(path.join(bundled, name), "jar");
  }
  const newest = path.join(bundled, "daisy-client-0.2.8.3+1.21.11.jar");
  fs.utimesSync(newest, 1, 1);
  const source = fs.readFileSync(path.join(__dirname, "../src/main.js"), "utf8");
  const start = source.indexOf("function resolveDaisyRuntimeJars(");
  const end = source.indexOf("function copyRuntimeJarToInstance(", start);
  const verifiedDaisyModJars = new Map();
  const context = vm.createContext({ fs, path, __dirname: f.dir, process: {},
    app: { getAppPath: () => f.dir }, findClientRoot: () => "", DEFAULT_MC_VERSION: "1.21.11",
    newestJarMatching: () => "", newestClientJar, verifiedDaisyModJars,
    clientcoreJarMatchesMc: (name, mc) => name.endsWith(`+${mc}.jar`)
  });
  vm.runInContext(source.slice(start, end), context);
  assert.equal(vm.runInContext("resolveDaisyRuntimeJars().clientJar", context), newest);
  const cache = path.join(f.dir, "daisy-client-0.2.8.4+1.21.11.jar");
  fs.writeFileSync(cache, "verified cache");
  verifiedDaisyModJars.set("1.21.11", cache);
  assert.equal(vm.runInContext("resolveDaisyRuntimeJars().clientJar", context), cache);
});
