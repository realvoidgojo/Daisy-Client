// Published four/five-part legacy versions remain comparable with SemVer betas.
const VERSION = /^\d+\.\d+\.\d+(?:\.\d+){0,2}(?:-(?:alpha|beta|rc)\.\d+)?$/;
function compareVersions(left, right) {
  const parse = (value) => {
    const [core, suffix] = String(value || "0").split("-");
    const [channel, sequence] = (suffix || "").split(".");
    return { core: core.split(".").map(Number), channel, sequence: Number(sequence || 0) };
  };
  const a = parse(left), b = parse(right);
  for (let i = 0; i < Math.max(a.core.length, b.core.length); i++) {
    const difference = (a.core[i] || 0) - (b.core[i] || 0);
    if (difference) return difference;
  }
  if (!a.channel || !b.channel) return Number(!a.channel) - Number(!b.channel);
  const order = { alpha: 0, beta: 1, rc: 2 };
  return order[a.channel] - order[b.channel] || a.sequence - b.sequence;
}
function clientJarIdentity(file) {
  const match = String(file).match(/^(?:daisy-client|clientcore)-(.+)\+(\d+(?:\.\d+)+)\.jar(?:\.disabled)?$/);
  return match && VERSION.test(match[1]) ? { version: match[1], minecraft: match[2] } : null;
}
function latestChannelRelease(releases, beta = false) {
  return (Array.isArray(releases) ? releases : [])
    .filter((release) => !release.draft && (beta || !release.prerelease)
      && release.tag_name?.startsWith("v") && VERSION.test(release.tag_name.slice(1)))
    .sort((a, b) => compareVersions(b.tag_name.slice(1), a.tag_name.slice(1)))[0] || null;
}
module.exports = { VERSION, compareVersions, clientJarIdentity, latestChannelRelease };
