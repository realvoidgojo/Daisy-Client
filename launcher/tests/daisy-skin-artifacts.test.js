const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('Testing Daisy Skin standalone artifact discovery and manifest validation...');

const repoRoot = path.resolve(__dirname, '../..');
const manifestPath = path.join(repoRoot, 'local-artifacts/skin/manifest.json');
assert(fs.existsSync(manifestPath), 'Skin manifest must exist at local-artifacts/skin/manifest.json');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.strictEqual(manifest.mod, 'Daisy Skin');
assert.strictEqual(manifest.id, 'daisyskin');
assert.strictEqual(manifest.author, 'realvoidgojo');

const requiredVersions = [
  "1.21", "1.21.1", "1.21.2", "1.21.3", "1.21.4", "1.21.5",
  "1.21.6", "1.21.7", "1.21.8", "1.21.10", "1.21.11", "26.1.2", "26.2"
];

for (const ver of requiredVersions) {
  const entry = manifest.artifacts[ver];
  assert(entry, `Manifest must contain entry for Minecraft ${ver}`);
  assert.strictEqual(entry.status, 'ready');
  assert.strictEqual(entry.loader, 'fabric');
  assert.strictEqual(entry.artifact, 'daisy-skin');

  const jarPath = path.resolve(repoRoot, entry.path);
  if (!fs.existsSync(jarPath)) {
    if (process.env.DAISY_REQUIRE_SKIN_ARTIFACTS === "1") throw new Error(`Missing optional skin artifact: ${jarPath}`);
    console.log(`Skipping local skin JAR checksum for ${ver}: artifact is not checked in`);
    continue;
  }

  const buffer = fs.readFileSync(jarPath);
  const actualHash = crypto.createHash('sha256').update(buffer).digest('hex');
  assert.strictEqual(actualHash, entry.sha256, `SHA-256 checksum must match for ${ver}`);
}

console.log('✓ All skin metadata checked; available local JAR checksums verified.');

