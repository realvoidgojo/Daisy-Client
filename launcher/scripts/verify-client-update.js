// Exercise the production updater against immutable published assets without Electron.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createDaisyModUpdater, pickDaisyModEntry, installDaisyModJar } = require("../src/daisy-mod-cache.js");

async function main() {
  const [tag, mcVersion = "1.21.11", kind = "client"] = process.argv.slice(2);
  if (!require("../src/version.js").VERSION.test((tag || "").slice(1)) || !tag.startsWith("v")) throw new Error("Usage: node scripts/verify-client-update.js v<version> [minecraft]");
  const manifestUrl = `https://github.com/realvoidgojo/Daisy-Client/releases/download/${tag}/latest.json`;
  const get = async (url) => {
    const response = await fetch(url, { signal: AbortSignal.timeout(120000), headers: { "User-Agent": "Daisy-Release-Verification" } });
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
    return response;
  };
  const manifest = await (await get(manifestUrl)).json();
  assert.equal(manifest.version, tag.slice(1));
  const entry = pickDaisyModEntry(manifest, mcVersion, kind);
  assert.ok(entry, `No valid client for ${mcVersion}`);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "daisy-release-smoke-"));
  try {
    let downloads = 0;
    const options = {
      mcVersion, cacheDir: path.join(directory, "cache"),
      fetchManifest: async () => ({ payload: manifest }),
      download: async (url, target) => {
        downloads++;
        fs.writeFileSync(target, Buffer.from(await (await get(url)).arrayBuffer()));
      }
    };
    const ensure = createDaisyModUpdater(kind);
    const result = await ensure(options);
    assert.equal(result.source, "download", result.error);
    assert.equal(path.basename(result.path), entry.name);
    assert.equal(fs.readFileSync(result.path).subarray(0, 2).toString(), "PK");
    assert.equal((await ensure(options)).source, "cache");
    assert.equal(downloads, 1);
    const offline = await createDaisyModUpdater(kind)({ ...options, fetchManifest: async () => null });
    assert.equal(offline.path, result.path);
    const installed = installDaisyModJar(result.path, path.join(directory, "instance", "mods"), mcVersion, kind);
    assert.equal(fs.statSync(installed.path).size, entry.size);
    console.log(`Verified ${entry.name}: download, SHA-256, cache reuse, offline reuse and instance installation.`);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
