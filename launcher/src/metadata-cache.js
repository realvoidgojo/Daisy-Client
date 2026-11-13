const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

// Version-specific Mojang/Fabric metadata can be reused without contacting social services.
async function cachedMetadata(url, directory, download, refresh = false) {
  const key = crypto.createHash("sha256").update(url).digest("hex");
  const target = path.join(directory, `${key}.json`);
  try {
    const record = JSON.parse(fs.readFileSync(target, "utf8"));
    if (!refresh && record.url === url && record.payload && typeof record.payload === "object") return record.payload;
  } catch { /* Missing/corrupt metadata must be fetched again. */ }
  const payload = await download();
  if (!payload || typeof payload !== "object") throw new Error("Game metadata is invalid.");
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(`${target}.partial`, JSON.stringify({ url, payload }));
  fs.renameSync(`${target}.partial`, target);
  return payload;
}
module.exports = { cachedMetadata };
