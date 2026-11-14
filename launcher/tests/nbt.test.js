const test = require("node:test");
const assert = require("node:assert/strict");
const zlib = require("node:zlib");
const { LIMITS, parseNbtBuffer } = require("../src/nbt.js");
const { parseNbtFileAsync } = require("../src/nbt.js");
const root = (...tags) => Buffer.concat([Buffer.from([10, 0, 0]), ...tags, Buffer.from([0])]);
const limits = (patch) => ({ ...LIMITS, ...patch });

test("plain and gzipped NBT preserve signed values and prototype-looking keys safely", () => {
  const bytes = root(Buffer.from([1, 0, 1, 120, 255]), Buffer.from([8, 0, 9]), Buffer.from("__proto__"), Buffer.from([0, 2]), Buffer.from("ok"));
  for (const value of [bytes, zlib.gzipSync(bytes)]) {
    const data = parseNbtBuffer(value);
    assert.equal(data.x, -1);
    assert.equal(data.__proto__, "ok");
    assert.equal(Object.getPrototypeOf(data), Object.prototype);
  }
});

test("NBT rejects compression bombs, oversized arrays, strings, nodes, depth and truncation", () => {
  assert.throws(() => parseNbtBuffer(zlib.gzipSync(Buffer.alloc(10000)), limits({ outputBytes: 100 })));
  assert.throws(() => parseNbtBuffer(root(), limits({ fileBytes: 2 })));
  assert.throws(() => parseNbtBuffer(root(Buffer.from([7, 0, 0, 127, 255, 255, 255]))));
  assert.throws(() => parseNbtBuffer(root(Buffer.from([7, 0, 0, 255, 255, 255, 255]))));
  assert.throws(() => parseNbtBuffer(root(Buffer.from([8, 0, 0, 0, 5, 65]))));
  assert.throws(() => parseNbtBuffer(root(Buffer.from([8, 0, 0, 0, 2, 65, 65])), limits({ stringBytes: 1 })));
  assert.throws(() => parseNbtBuffer(root(Buffer.from([10, 0, 0, 0])), limits({ depth: 0 })));
  assert.throws(() => parseNbtBuffer(root(Buffer.from([1, 0, 0, 1])), limits({ nodes: 1 })));
  assert.throws(() => parseNbtBuffer(root(Buffer.from([9, 0, 0, 0, 0, 0, 0, 1]))));
  assert.throws(() => parseNbtBuffer(Buffer.from([10, 0, 0, 255])));
});

test("asynchronous NBT metadata loading handles gzip, refreshes changed files and fails closed", async (t) => {
  const fs = require("node:fs");
  const path = require("node:path");
  const directory = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "daisy-nbt-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, "level.dat");
  fs.writeFileSync(file, zlib.gzipSync(root(Buffer.from([1, 0, 1, 120, 1]))));
  assert.equal((await parseNbtFileAsync(file)).x, 1);
  fs.writeFileSync(file, root(Buffer.from([1, 0, 1, 120, 2])));
  assert.equal((await parseNbtFileAsync(file)).x, 2);
  fs.writeFileSync(file, Buffer.from([10, 0, 0]));
  assert.equal(await parseNbtFileAsync(file), null);
  assert.equal(await parseNbtFileAsync(path.join(directory, "missing")), null);
});
