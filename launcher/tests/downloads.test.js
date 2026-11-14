const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { Writable } = require("node:stream");
const { downloadToFile, hashFile } = require("../src/downloads.js");
const { directorySize } = require("../src/storage.js");

function setup(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "daisy-stream-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { root, target: path.join(root, "artifact.jar") };
}
const response = (data, headers) => async () => new Response(data, { headers });

test("download streams bytes with progress, verifies checksum and replaces only after success", async (t) => {
  const { root, target } = setup(t);
  const bytes = crypto.randomBytes(3 * 1024 * 1024);
  const expected = crypto.createHash("sha256").update(bytes).digest("hex");
  const progress = [];
  fs.writeFileSync(target, "old");
  await downloadToFile("https://example.test/file", target, { totalBytes: bytes.length, sha256: expected, fetchImpl: response(bytes), onProgress: (event) => progress.push(event) });
  assert.equal(await hashFile(target), expected);
  assert.equal(progress.at(-1).downloaded, bytes.length);
  assert.equal(progress.at(-1).total, bytes.length);
  assert.deepEqual(fs.readdirSync(root), ["artifact.jar"]);
});

test("missing length, incorrect size, checksum, HTTP and disk errors leave no partial downloads", async (t) => {
  const { root, target } = setup(t);
  fs.writeFileSync(target, "keep");
  const cases = [
    { fetchImpl: response("large"), maxBytes: 2 },
    { fetchImpl: response("large", { "content-length": "100" }), maxBytes: 10 },
    { fetchImpl: response("short"), totalBytes: 10 },
    { fetchImpl: response("wrong"), sha256: "0".repeat(64) },
    { fetchImpl: async () => new Response("error", { status: 500 }) },
    { fetchImpl: response("data"), filesystem: { ...fs, createWriteStream: () => new Writable({ write(_chunk, _encoding, callback) { callback(new Error("disk full")); } }) } }
  ];
  for (const options of cases) {
    await assert.rejects(downloadToFile("https://example.test/file", target, options));
    assert.equal(fs.readFileSync(target, "utf8"), "keep");
    assert.deepEqual(fs.readdirSync(root), ["artifact.jar"]);
  }
});

test("stalled body is cancelled and partial output removed", async (t) => {
  const { root, target } = setup(t);
  let cancelled = false;
  const body = new ReadableStream({ start(controller) { controller.enqueue(Buffer.from("first")); }, cancel() { cancelled = true; } });
  await assert.rejects(downloadToFile("https://example.test/file", target, { timeoutMs: 30, fetchImpl: async () => new Response(body) }), /timed out/);
  assert.ok(cancelled);
  assert.deepEqual(fs.readdirSync(root), []);
});

test("storage scanning skips cyclic junctions and shares concurrent scans", async (t) => {
  const { root, target } = setup(t);
  fs.writeFileSync(target, "12345");
  const directory = path.join(root, "nested"); fs.mkdirSync(directory);
  fs.writeFileSync(path.join(directory, "other"), "123");
  fs.symlinkSync(root, path.join(directory, "cycle"), process.platform === "win32" ? "junction" : "dir");
  const first = directorySize(root);
  assert.equal(first, directorySize(root));
  assert.equal(await first, 8);
});
