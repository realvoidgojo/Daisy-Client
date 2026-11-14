const fs = require("node:fs");
const zlib = require("node:zlib");
const { promisify } = require("node:util");
const { readBoundedFile } = require("./storage.js");

const LIMITS = Object.freeze({ fileBytes: 8 * 1024 * 1024, outputBytes: 32 * 1024 * 1024, depth: 64, nodes: 100000, arrayLength: 100000, stringBytes: 65535 });

function parseNbtBuffer(raw, limits = LIMITS) {
  if (raw.length > limits.fileBytes) throw new Error("NBT input is too large.");
  const data = raw[0] === 0x1f && raw[1] === 0x8b ? zlib.gunzipSync(raw, { maxOutputLength: limits.outputBytes }) : raw;
  if (data.length > limits.outputBytes) throw new Error("NBT output is too large.");
  let offset = 0;
  let nodes = 0;
  function take(bytes) {
    if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > data.length - offset) throw new Error("Truncated NBT data.");
    const start = offset;
    offset += bytes;
    return start;
  }
  const byte = () => data.readUInt8(take(1));
  const int = () => data.readInt32BE(take(4));
  function string() {
    const length = data.readUInt16BE(take(2));
    if (length > limits.stringBytes) throw new Error("NBT string is too large.");
    const start = take(length);
    return data.toString("utf8", start, start + length);
  }
  function length() {
    const count = int();
    if (count < 0 || count > limits.arrayLength) throw new Error("NBT array is too large or has a negative length.");
    return count;
  }
  function payload(type, depth) {
    if (++nodes > limits.nodes || depth > limits.depth) throw new Error("NBT structure limit exceeded.");
    switch (type) {
      case 1: return data.readInt8(take(1));
      case 2: return data.readInt16BE(take(2));
      case 3: return int();
      case 4: return Number(data.readBigInt64BE(take(8)));
      case 5: return data.readFloatBE(take(4));
      case 6: return data.readDoubleBE(take(8));
      case 7: take(length()); return null;
      case 8: return string();
      case 9: {
        const elementType = byte();
        const count = length();
        if (elementType > 12 || (elementType === 0 && count)) throw new Error("Invalid NBT list type.");
        const result = [];
        for (let i = 0; i < count; i++) result.push(payload(elementType, depth + 1));
        return result;
      }
      case 10: {
        const result = {};
        for (;;) {
          const tag = byte();
          if (!tag) return result;
          const name = string();
          // Treat prototype-looking names as ordinary data, never setters.
          Object.defineProperty(result, name, { value: payload(tag, depth + 1), enumerable: true, configurable: true, writable: true });
        }
      }
      case 11: take(length() * 4); return null;
      case 12: take(length() * 8); return null;
      default: throw new Error("Invalid NBT tag.");
    }
  }
  if (byte() !== 10) throw new Error("NBT root must be a compound.");
  string();
  const result = payload(10, 0);
  if (offset !== data.length) throw new Error("Unexpected trailing NBT data.");
  return result;
}

// Small metadata files only. Cache unchanged files to avoid repeated decompression
// on status refresh; never retain more than 16 parsed trees.
const cache = new Map();
function parseNbtFile(file) {
  try {
    const fd = fs.openSync(file, "r");
    try {
      const stat = fs.fstatSync(fd);
      if (!stat.isFile() || stat.size > LIMITS.fileBytes) return null;
      const key = `${stat.dev}:${stat.ino}:${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`;
      const previous = cache.get(file);
      if (previous?.key === key) return previous.value;
      const raw = Buffer.alloc(stat.size);
      let offset = 0;
      while (offset < raw.length) {
        const count = fs.readSync(fd, raw, offset, raw.length - offset, offset);
        if (!count) return null;
        offset += count;
      }
      const value = parseNbtBuffer(raw);
      if (cache.size >= 16) cache.delete(cache.keys().next().value);
      cache.set(file, { key, value });
      return value;
    } finally { fs.closeSync(fd); }
  } catch { return null; }
}

async function parseNbtFileAsync(file) {
  try {
    const stat = await fs.promises.stat(file);
    if (!stat.isFile() || stat.size > LIMITS.fileBytes) return null;
    const key = `${stat.dev}:${stat.ino}:${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`;
    if (cache.get(file)?.key === key) return cache.get(file).value;
    const raw = await readBoundedFile(file, LIMITS.fileBytes);
    const data = raw[0] === 0x1f && raw[1] === 0x8b ? await promisify(zlib.gunzip)(raw, { maxOutputLength: LIMITS.outputBytes }) : raw;
    const value = parseNbtBuffer(data, { ...LIMITS, fileBytes: LIMITS.outputBytes });
    if (cache.size >= 16) cache.delete(cache.keys().next().value);
    cache.set(file, { key, value });
    return value;
  } catch { return null; }
}

module.exports = { LIMITS, parseNbtBuffer, parseNbtFile, parseNbtFileAsync };
