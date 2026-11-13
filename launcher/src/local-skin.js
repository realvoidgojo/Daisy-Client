const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");

// One contract shared by the full client and the source-built standalone skin mod.
function syncLocalSkin(instancePath, playerName, uuid, active) {
  if (!active?.path || !fs.existsSync(active.path)) return null;
  if (!/^[A-Za-z0-9_]{1,16}$/.test(playerName)) throw new Error("Invalid local player name.");
  const data = fs.readFileSync(active.path);
  if (data.length < 24 || !data.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))
      || data.readUInt32BE(16) !== 64 || ![32, 64].includes(data.readUInt32BE(20))) {
    throw new Error("Local skins must be 64×32 or 64×64 PNG files.");
  }
  const sha256 = crypto.createHash("sha256").update(data).digest("hex");
  const cached = path.join(instancePath, "daisy", "cache", "assets", `${sha256}.png`);
  const local = path.join(instancePath, "CustomSkinLoader", "LocalSkin", "skins", `${playerName}.png`);
  for (const target of [cached, local]) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, data);
  }
  const config = path.join(instancePath, "daisy", "config", "local_appearance.json");
  let previous = {};
  try { previous = JSON.parse(fs.readFileSync(config, "utf8")); } catch { }
  const sameAccount = String(previous.uuid || "").replace(/-/g, "").toLowerCase() === String(uuid).replace(/-/g, "").toLowerCase();
  const appearance = {
    uuid, skin: { assetId: sha256, sha256, url: pathToFileURL(cached).href },
    cape: sameAccount ? previous.cape || null : null,
    model: active.variant === "slim" ? "slim" : "classic", updatedAt: Date.now()
  };
  fs.mkdirSync(path.dirname(config), { recursive: true });
  fs.writeFileSync(`${config}.partial`, JSON.stringify(appearance, null, 2));
  fs.renameSync(`${config}.partial`, config);
  return appearance;
}
module.exports = { syncLocalSkin };
