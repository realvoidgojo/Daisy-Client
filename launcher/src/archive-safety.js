const fs = require("node:fs");
const path = require("node:path");
const { TextDecoder } = require("node:util");
const zlib = require("node:zlib");
const crypto = require("node:crypto");
const { Readable, Transform } = require("node:stream");
const { pipeline } = require("node:stream/promises");

const RVR_SETTINGS_FILES = Object.freeze(["options.txt", "config/yacl.json5", "config/noisium.json"]);
const WINDOWS_DEVICE = /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i;

// Validate original input before normalization. Never turn an unsafe path into a
// different, apparently safe filename. Apply Windows rules on every platform.
function archiveRelativePath(value, directory = false) {
  if (typeof value !== "string" || !value || /[\x00-\x1f\x7f<>:"|?*]/.test(value)) {
    throw new Error("Archive contains an unsafe path.");
  }
  let name = value.replace(/\\/g, "/");
  if (name.startsWith("/") || path.win32.isAbsolute(value)) throw new Error(`Unsafe archive path: ${value}`);
  if (directory && name.endsWith("/")) name = name.slice(0, -1);
  const parts = name.split("/");
  if (parts.some(part => !part || part === "." || part === ".." || /[. ]$/.test(part) || WINDOWS_DEVICE.test(part))) {
    throw new Error(`Unsafe archive path: ${value}`);
  }
  return parts.join("/");
}

function archiveTarget(root, relative) {
  const name = archiveRelativePath(relative);
  const base = path.resolve(root);
  const target = path.resolve(base, ...name.split("/"));
  const remainder = path.relative(base, target);
  if (!remainder || remainder === ".." || remainder.startsWith(`..${path.sep}`) || path.isAbsolute(remainder)) {
    throw new Error(`Archive path escapes its destination: ${relative}`);
  }
  // Reject existing symlinks/junctions and hard-linked files, including the leaf.
  let current = base;
  for (const part of ["", ...name.split("/")]) {
    if (part) current = path.join(current, part);
    try {
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink() || (stat.isFile() && stat.nlink > 1)) throw new Error("Archive target contains a filesystem link.");
    } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  return target;
}

function assertNoArchiveLinks(root) {
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink() || (stat.isFile() && stat.nlink > 1)) throw new Error("Archive contains a filesystem link.");
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(current)) pending.push(path.join(current, name));
    } else if (!stat.isFile()) throw new Error("Archive contains a special filesystem entry.");
  }
}

function planRvrSettings(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) throw new Error("Invalid instance settings snapshot.");
  return Object.entries(snapshot).map(([relative, content]) => {
    const name = archiveRelativePath(relative);
    if (!RVR_SETTINGS_FILES.includes(name) || typeof content !== "string") {
      throw new Error(`Unsupported instance settings entry: ${relative}`);
    }
    return { relative: name, content };
  });
}

function writeRvrSettings(destination, settings) {
  // Validate the entire plan before writing any file.
  const targets = settings.map(entry => ({ ...entry, target: archiveTarget(destination, entry.relative) }));
  for (const { target, content } of targets) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    // The import destination is new: an existing file/link is an error, not an
    // overwrite opportunity. Recheck parents immediately before the write.
    archiveTarget(destination, path.relative(destination, target));
    fs.writeFileSync(target, content, { encoding: "utf8", flag: "wx" });
  }
}

// Read metadata asynchronously, not every compressed file into the Electron main
// process. Streaming extraction starts only after every ZIP entry passes.
async function validateArchivePaths(file, limits = {}, descriptor = null) {
  const input = descriptor || await fs.promises.open(file, "r");
  const maxEntryBytes = limits.maxEntryBytes ?? 512 * 1024 * 1024;
  const maxTotalBytes = limits.maxTotalBytes ?? 4 * 1024 * 1024 * 1024;
  try {
    const size = (await input.stat()).size;
    const read = async (offset, length) => {
      if (offset < 0 || length < 0 || offset + length > size) throw new Error("Invalid ZIP entry bounds.");
      const buffer = Buffer.alloc(length);
      let done = 0;
      while (done < length) {
        const { bytesRead } = await input.read(buffer, done, length - done, offset + done);
        if (!bytesRead) throw new Error("Truncated ZIP archive.");
        done += bytesRead;
      }
      return buffer;
    };
    const validateExtra = extra => {
      for (let pos = 0; pos < extra.length;) {
        if (pos + 4 > extra.length) throw new Error("Invalid ZIP extra field.");
        const type = extra.readUInt16LE(pos), length = extra.readUInt16LE(pos + 2);
        if (type === 1 || type === 0x7075 || pos + 4 + length > extra.length) throw new Error("Unsupported ZIP path/ZIP64 extra field.");
        pos += 4 + length;
      }
    };
    const tailOffset = Math.max(0, size - 65557);
    const tail = await read(tailOffset, size - tailOffset);
    let end = -1;
    for (let i = tail.length - 22; i >= 0; i--) {
      if (tail.readUInt32LE(i) === 0x06054b50 && i + 22 + tail.readUInt16LE(i + 20) === tail.length) { end = i; break; }
    }
    if (end < 0) throw new Error("Invalid ZIP archive directory.");
    const count = tail.readUInt16LE(end + 10);
    const centralSize = tail.readUInt32LE(end + 12);
    const centralOffset = tail.readUInt32LE(end + 16);
    if (tail.readUInt16LE(end + 4) || tail.readUInt16LE(end + 6)
        || tail.readUInt16LE(end + 8) !== count || count === 65535
        || centralSize === 0xffffffff || centralOffset === 0xffffffff
        || centralOffset + centralSize !== tailOffset + end) {
      throw new Error("Unsupported split/ZIP64 archive or inconsistent ZIP directory.");
    }
    const decoder = new TextDecoder("utf-8", { fatal: true });
    const names = new Set();
    const entries = [];
    let expanded = 0;
    let offset = centralOffset;
    for (let index = 0; index < count; index++) {
      const header = await read(offset, 46);
      if (header.readUInt32LE(0) !== 0x02014b50) throw new Error("Invalid ZIP directory entry.");
      const flags = header.readUInt16LE(8), method = header.readUInt16LE(10);
      const compressed = header.readUInt32LE(20), uncompressed = header.readUInt32LE(24);
      const nameLength = header.readUInt16LE(28), extraLength = header.readUInt16LE(30), commentLength = header.readUInt16LE(32);
      const attributes = header.readUInt32LE(38), mode = (attributes >>> 16) & 0xf000;
      const localOffset = header.readUInt32LE(42);
      if ((flags & 1) || ![0, 8].includes(method) || header.readUInt16LE(34)
          || compressed === 0xffffffff || uncompressed === 0xffffffff || localOffset === 0xffffffff
          || ![0, 0x4000, 0x8000].includes(mode) || (attributes & 0x400)) {
        throw new Error("Unsupported or linked ZIP entry.");
      }
      expanded += uncompressed;
      if (uncompressed > maxEntryBytes || expanded > maxTotalBytes) throw new Error("Archive exceeds its extraction size limit.");
      const rawName = await read(offset + 46, nameLength);
      if (!(flags & 0x800) && rawName.some(byte => byte > 127)) throw new Error("ZIP filenames must use UTF-8 or ASCII.");
      const name = decoder.decode(rawName);
      const normalized = archiveRelativePath(name, /[\\/]$/.test(name));
      const key = normalized.toLowerCase();
      if (names.has(key)) throw new Error("Archive contains colliding paths.");
      names.add(key);
      const extra = await read(offset + 46 + nameLength, extraLength);
      validateExtra(extra);
      const local = await read(localOffset, 30);
      const localNameLength = local.readUInt16LE(26), localExtraLength = local.readUInt16LE(28);
      if (local.readUInt32LE(0) !== 0x04034b50 || local.readUInt16LE(6) !== flags || local.readUInt16LE(8) !== method
          || localOffset + 30 + localNameLength + localExtraLength + compressed > centralOffset
          || !(await read(localOffset + 30, localNameLength)).equals(rawName)) {
        throw new Error("ZIP local and directory entries disagree.");
      }
      validateExtra(await read(localOffset + 30 + localNameLength, localExtraLength));
      entries.push({ name: normalized, directory: /[\\/]$/.test(name), method, compressed, uncompressed,
        crc: header.readUInt32LE(16), offset: localOffset + 30 + localNameLength + localExtraLength });
      offset += 46 + nameLength + extraLength + commentLength;
      if (offset > centralOffset + centralSize) throw new Error("ZIP directory entry exceeds its bounds.");
    }
    if (offset !== centralOffset + centralSize) throw new Error("ZIP directory entry count is inconsistent.");
    return entries;
  } finally { if (!descriptor) await input.close(); }
}

async function existingEntryMatches(target, entry) {
  try {
    if ((await fs.promises.stat(target)).size !== entry.uncompressed) return false;
    let crc = 0;
    for await (const chunk of fs.createReadStream(target)) crc = zlib.crc32(chunk, crc);
    return crc === entry.crc;
  } catch (error) { if (error.code === "ENOENT") return false; throw error; }
}

async function readArchiveEntry(file, name, maxBytes = 4 * 1024 * 1024) {
  const input = await fs.promises.open(file, "r");
  try {
    const entry = (await validateArchivePaths(file, {}, input)).find(entry => entry.name === name && !entry.directory);
    if (!entry) return null;
    if (entry.uncompressed > maxBytes) throw new Error("Archive metadata exceeds its size limit.");
    const source = entry.compressed ? input.createReadStream({ start: entry.offset, end: entry.offset + entry.compressed - 1, autoClose: false }) : Readable.from([]);
    let size = 0, crc = 0;
    const chunks = [];
    const sink = new Transform({ transform(chunk, _encoding, callback) {
      size += chunk.length;
      if (size > entry.uncompressed || size > maxBytes) return callback(new Error("Archive metadata exceeds its size limit."));
      crc = zlib.crc32(chunk, crc);
      chunks.push(chunk);
      callback();
    } });
    await pipeline(...(entry.method === 8 ? [source, zlib.createInflateRaw(), sink] : [source, sink]));
    if (size !== entry.uncompressed || crc !== entry.crc) throw new Error("Archive metadata failed CRC verification.");
    return Buffer.concat(chunks, size);
  } finally { await input.close(); }
}

async function extractArchive(file, destination, { filter = () => true, mapName = name => name, overwrite = false, skipExisting = false, ...limits } = {}) {
  const input = await fs.promises.open(file, "r");
  try {
    // Hold the same descriptor for validation and extraction; never reopen paths
    // based on untrusted local ZIP headers or delegate decoding to another parser.
    const entries = await validateArchivePaths(file, limits, input);
    await fs.promises.mkdir(destination, { recursive: true });
    for (const entry of entries) {
      if (!filter(entry.name)) continue;
      const relative = mapName(entry.name);
      const target = archiveTarget(destination, relative);
      if (entry.directory) { await fs.promises.mkdir(target, { recursive: true }); continue; }
      if (skipExisting && await existingEntryMatches(target, entry)) continue;
      await fs.promises.mkdir(path.dirname(target), { recursive: true });
      archiveTarget(destination, relative);
      const output = overwrite ? `${target}.${crypto.randomUUID()}.extract` : target;
      let created = false;
      try {
        const sink = fs.createWriteStream(output, { flags: "wx", mode: 0o600 });
        sink.once("open", () => { created = true; });
        const source = entry.compressed ? input.createReadStream({ start: entry.offset, end: entry.offset + entry.compressed - 1, autoClose: false }) : Readable.from([]);
        let count = 0, crc = 0;
        const checked = new Transform({ transform(chunk, _encoding, callback) {
          count += chunk.length;
          if (count > entry.uncompressed) return callback(new Error("ZIP entry exceeds its declared size."));
          crc = zlib.crc32(chunk, crc);
          callback(null, chunk);
        } });
        const stages = entry.method === 8 ? [source, zlib.createInflateRaw(), checked, sink] : [source, checked, sink];
        await pipeline(...stages);
        if (count !== entry.uncompressed || crc !== entry.crc) throw new Error("ZIP entry size or CRC verification failed.");
        if (overwrite) {
          archiveTarget(destination, relative);
          await fs.promises.rename(output, target);
        }
      } catch (error) {
        if (created) await fs.promises.rm(output, { force: true });
        throw error;
      }
    }
  } finally { await input.close(); }
}

module.exports = { archiveRelativePath, archiveTarget, assertNoArchiveLinks, planRvrSettings, writeRvrSettings, validateArchivePaths, extractArchive, readArchiveEntry, RVR_SETTINGS_FILES };
