const fs = require("node:fs/promises");
const path = require("node:path");

// Asynchronous, bounded traversal. Never follow symlinks/junctions into another
// tree, and share in-flight scans across repeated renderer refreshes.
const scans = new Map();
function directorySize(root) {
  if (!root) return Promise.resolve(0);
  const previous = scans.get(root);
  if (previous && Date.now() - previous.started < 10000) return previous.promise;
  const promise = scan(root);
  if (scans.size >= 32) scans.delete(scans.keys().next().value);
  scans.set(root, { started: Date.now(), promise });
  return promise;
}
async function scan(root) {
  const pending = [root];
  let total = 0, visited = 0;
  while (pending.length) {
    if (++visited > 200000) throw new Error("Storage scan limit reached.");
    const current = pending.pop();
    try {
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink()) continue;
      if (stat.isFile()) { total += stat.size; continue; }
      if (!stat.isDirectory()) continue;
      const directory = await fs.opendir(current);
      for await (const entry of directory) {
        if (pending.length + visited > 200000) throw new Error("Storage scan limit reached.");
        if (!entry.isSymbolicLink()) pending.push(path.join(current, entry.name));
      }
    } catch (error) { if (!["ENOENT", "ENOTDIR", "EACCES", "EPERM"].includes(error.code)) throw error; }
  }
  return total;
}
function invalidateStorageScans() { scans.clear(); }
async function readBoundedFile(file, maxBytes) {
  const input = await fs.open(file, "r");
  try {
    const stat = await input.stat();
    if (!stat.isFile() || stat.size > maxBytes) throw new Error("Metadata file exceeds its size limit.");
    const data = Buffer.alloc(stat.size);
    let offset = 0;
    while (offset < data.length) {
      const { bytesRead } = await input.read(data, offset, data.length - offset, offset);
      if (!bytesRead) throw new Error("Metadata file was truncated.");
      offset += bytesRead;
    }
    return data;
  } finally { await input.close(); }
}
module.exports = { directorySize, invalidateStorageScans, readBoundedFile };
