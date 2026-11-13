const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const vm = require("node:vm");
test("optional local skin discovery never claims a missing or mismatched JAR is ready", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "daisy-skin-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = fs.readFileSync(path.join(__dirname, "../src/main.js"), "utf8");
  const start = source.indexOf("function resolveDaisySkinJar(");
  const end = source.indexOf("function ensureDaisySkinMod(", start);
  const context = vm.createContext({ fs, path, __dirname: root, process: {},
    DEFAULT_MC_VERSION: "1.21.11", findClientRoot: () => "", app: { getAppPath: () => root } });
  vm.runInContext(source.slice(start, end), context);
  assert.equal(vm.runInContext('resolveDaisySkinJar("1.21.11")', context), "");
  const jar = path.join(root, "bundled", "skin", "1.21.11", "daisy-skin-0.1.0+1.21.11.jar");
  fs.mkdirSync(path.dirname(jar), { recursive: true });
  fs.writeFileSync(jar, "local fixture");
  assert.equal(vm.runInContext('resolveDaisySkinJar("1.21.11")', context), jar);
  assert.equal(vm.runInContext('resolveDaisySkinJar("26.2")', context), "");
});
