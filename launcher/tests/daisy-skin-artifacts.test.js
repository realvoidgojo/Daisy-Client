const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const vm = require("node:vm");
const crypto = require("node:crypto");
const { createDaisyModUpdater, pickDaisyModEntry, installDaisyModJar } = require("../src/daisy-mod-cache.js");
const { syncLocalSkin } = require("../src/local-skin.js");
const source = fs.readFileSync(path.join(__dirname, "../src/main.js"), "utf8");
function temporary(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "daisy-skin-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
function skinContext(root, extra = {}) {
  const context = vm.createContext({ fs, path, __dirname: root, process: {}, DEFAULT_MC_VERSION: "1.21.11",
    findClientRoot: () => "", readBuildVersion: () => "1.0.0-beta.3", app: { getAppPath: () => root },
    isRealRuntimeJar: p => Boolean(p) && fs.existsSync(p) && fs.statSync(p).isFile(),
    emit: () => {}, emitActivity: () => {}, ...extra });
  const start = source.indexOf("function resolveDaisySkinJar(");
  const end = source.indexOf("function ensureBundledClientCoreMod(", start);
  vm.runInContext(source.slice(start, end), context);
  return context;
}
test("skin discovery accepts only coordinated source-built flat bundles", t => {
  const root = temporary(t), context = skinContext(root);
  assert.equal(vm.runInContext('resolveDaisySkinJar("1.21.11")', context), "");
  const old = path.join(root, "bundled", "skin", "1.21.11", "daisy-skin-0.1.0+1.21.11.jar");
  fs.mkdirSync(path.dirname(old), { recursive: true }); fs.writeFileSync(old, "unreviewed");
  assert.equal(vm.runInContext('resolveDaisySkinJar("1.21.11")', context), "");
  const jar = path.join(root, "bundled", "daisy-skin-1.0.0-beta.3+1.21.11.jar"); fs.writeFileSync(jar, "bundle");
  assert.equal(vm.runInContext('resolveDaisySkinJar("1.21.11")', context), jar);
  assert.equal(vm.runInContext('resolveDaisySkinJar("26.2")', context), "");
});
test("full Daisy disables the standalone skin JAR without downloading or deleting it", async t => {
  const root = temporary(t), mods = path.join(root, "mods"); fs.mkdirSync(mods);
  const skin = "daisy-skin-0.1.0+1.21.11.jar";
  fs.writeFileSync(path.join(mods, skin), "preserve");
  fs.writeFileSync(path.join(mods, "daisy-client-1.0.0-beta.3+1.21.11.jar"), "client");
  const context = skinContext(root, { root });
  const result = await vm.runInContext('ensureDaisySkinMod(root, "1.21.11")', context);
  assert.equal(result.builtIn, true);
  assert.equal(fs.readFileSync(path.join(mods, skin + ".disabled"), "utf8"), "preserve");
  assert.ok(!fs.existsSync(path.join(mods, skin)));
});
test("skin release updates verify integrity, reuse offline, and preserve disablement", async t => {
  const root = temporary(t), bytes = Buffer.from("skin fixture"), version = "1.0.0-beta.3", mcVersion = "26.2";
  const name = `daisy-skin-${version}+${mcVersion}.jar`;
  const entry = { name, minecraft: mcVersion, size: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    url: `https://github.com/realvoidgojo/Daisy-Client/releases/download/v${version}/${name}` };
  const payload = { version, skins: [entry] };
  assert.equal(pickDaisyModEntry(payload, mcVersion), null);
  assert.equal(pickDaisyModEntry({ version, skins: [{ ...entry, name: name.replace("skin", "client") }] }, mcVersion, "skin"), null);
  assert.equal(pickDaisyModEntry(payload, "1.21.11", "skin"), null);
  const options = { mcVersion, cacheDir: path.join(root, "cache"), fetchManifest: async () => payload,
    download: async (_url, file) => fs.writeFileSync(file, bytes) };
  const ensure = createDaisyModUpdater("skin"), result = await ensure(options);
  assert.equal(result.source, "download");
  assert.equal((await ensure(options)).source, "cache");
  assert.equal((await ensure({ ...options, fetchManifest: async () => null })).path, result.path);
  const mods = path.join(root, "mods"); fs.mkdirSync(mods);
  fs.writeFileSync(path.join(mods, "daisy-skin-1.0.0-beta.2+26.2.jar.disabled"), "old");
  const installed = installDaisyModJar(result.path, mods, mcVersion, "skin");
  assert.equal(installed.disabled, true);
  assert.deepEqual(fs.readFileSync(installed.path), bytes);
  fs.writeFileSync(result.path, "corrupt");
  assert.equal((await ensure({ ...options, fetchManifest: async () => null })).path, "");
});
test("local skin sync updates slim/classic metadata and cached bytes without a service", t => {
  const root = temporary(t), png = Buffer.alloc(24);
  Buffer.from("89504e470d0a1a0a", "hex").copy(png); png.writeUInt32BE(64, 16); png.writeUInt32BE(64, 20);
  const file = path.join(root, "skin.png"); fs.writeFileSync(file, png);
  const first = syncLocalSkin(root, "LocalPlayer", "uuid", { path: file, variant: "slim" });
  assert.equal(first.model, "slim");
  const config = path.join(root, "daisy/config/local_appearance.json");
  fs.writeFileSync(config, JSON.stringify({ ...first, cape: { assetId: "owned-local-cape" } }));
  const next = syncLocalSkin(root, "LocalPlayer", "uuid", { path: file, variant: "classic" });
  assert.equal(next.model, "classic"); assert.equal(next.cape.assetId, "owned-local-cape");
  assert.ok(fs.existsSync(path.join(root, "daisy/cache/assets", next.skin.sha256 + ".png")));
  assert.equal(syncLocalSkin(root, "LocalPlayer", "another-account", { path: file }).cape, null);
  assert.throws(() => syncLocalSkin(root, "../escape", "uuid", { path: file }), /Invalid/);
});

test("installed skin dependencies work offline and a missing required dependency fails", async t => {
  const root = temporary(t), mods = path.join(root, "mods"); fs.mkdirSync(mods);
  for (const id of ["fabric-api", "fabric-language-kotlin"]) fs.writeFileSync(path.join(mods, id + ".jar"), "fixture");
  let networkCalls = 0;
  const context = vm.createContext({ fs, path, root, Set, readJarModInfo: file => ({ id: path.basename(file, ".jar") }),
    requiredSupportMods: [{ slug: "fabric-api", name: "Fabric API" }, { slug: "fabric-language-kotlin", name: "Kotlin" }],
    emit: () => {}, emitActivity: () => {},
    resolveModrinthProjectId: async () => { networkCalls++; return ""; } });
  const start = source.indexOf("async function ensureRequiredSupportMods(");
  const end = source.indexOf("async function createPvpInstance(", start);
  vm.runInContext(source.slice(start, end), context);
  assert.equal((await vm.runInContext('ensureRequiredSupportMods(root, "1.21.11")', context)).ok, true);
  assert.equal(networkCalls, 0);
  fs.renameSync(path.join(mods, "fabric-language-kotlin.jar"), path.join(mods, "fabric-language-kotlin.jar.disabled"));
  assert.equal((await vm.runInContext('ensureRequiredSupportMods(root, "1.21.11")', context)).ok, false);
  assert.equal(networkCalls, 1);
});
