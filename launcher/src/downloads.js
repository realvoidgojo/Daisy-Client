const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { promisify } = require("node:util");
const { Readable, Transform } = require("node:stream");
const { pipeline } = require("node:stream/promises");

async function hashFile(file, algorithm = "sha256", filesystem = fs) {
  const hash = crypto.createHash(algorithm);
  for await (const chunk of filesystem.createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

async function downloadToFile(url, target, options = {}) {
  const filesystem = options.filesystem || fs;
  const maxBytes = options.maxBytes ?? 1024 * 1024 * 1024;
  const timeoutMs = options.timeoutMs ?? 45000;
  const expected = options.totalBytes || 0;
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || !Number.isSafeInteger(expected) || expected < 0 || expected > maxBytes) throw new Error("Invalid download size limit.");
  const controller = new AbortController();
  let timer;
  const resetTimeout = () => {
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort(new Error("Download stopped receiving data.")), timeoutMs);
  };
  const temp = `${target}.${crypto.randomUUID()}.download`;
  let created = false;
  let transferred = 0;
  const started = Date.now();
  let lastProgress = 0;
  let total = expected;
  const progress = () => {
    const speed = transferred / Math.max(0.001, (Date.now() - started) / 1000);
    options.onProgress?.({ downloaded: transferred, total, speed, eta: total ? Math.max(0, total - transferred) / Math.max(1, speed) : 0 });
    lastProgress = Date.now();
  };
  resetTimeout();
  try {
    const response = await (options.fetchImpl || fetch)(url, { headers: options.headers, signal: controller.signal });
    if (!response.ok || !response.body) throw new Error(`Download failed with ${response.status}.`);
    const lengthHeader = response.headers.get("content-length");
    const encoded = response.headers.get("content-encoding");
    const length = !encoded && lengthHeader !== null ? Number(lengthHeader) : 0;
    if (!Number.isSafeInteger(length) || length < 0 || length > maxBytes || (expected && length && expected !== length)) throw new Error("Download size is invalid or exceeds its limit.");
    total = expected || length;
    const hash = options.sha256 ? crypto.createHash("sha256") : null;
    const checked = new Transform({ transform(chunk, _encoding, callback) {
      resetTimeout();
      transferred += chunk.length;
      if (transferred > maxBytes || (total && transferred > total)) return callback(new Error("Download exceeds its size limit."));
      hash?.update(chunk);
      try { if (Date.now() - lastProgress >= 250) progress(); }
      catch (error) { return callback(error); }
      callback(null, chunk);
    } });
    const sink = filesystem.createWriteStream(temp, { flags: "wx", mode: 0o600 });
    sink.once("open", () => { created = true; });
    await pipeline(Readable.fromWeb(response.body), checked, sink, { signal: controller.signal });
    if (total && transferred !== total) throw new Error("Download was incomplete.");
    if (hash && hash.digest("hex").toLowerCase() !== options.sha256.toLowerCase()) throw new Error("Download checksum did not match.");
    progress();
    clearTimeout(timer);
    if (options.finalize) await options.finalize(temp, target);
    else await promisify(filesystem.rename.bind(filesystem))(temp, target);
    return { downloaded: transferred, total };
  } catch (error) {
    controller.abort();
    if (created) await promisify(filesystem.rm.bind(filesystem))(temp, { force: true }).catch(() => {});
    if (error.name === "AbortError") throw new Error(`Download timed out: ${path.basename(target)}`);
    throw error;
  } finally { clearTimeout(timer); }
}

module.exports = { hashFile, downloadToFile };
