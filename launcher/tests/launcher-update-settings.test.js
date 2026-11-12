const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const esbuild = require("esbuild");

const output = esbuild.buildSync({
  entryPoints: [path.join(__dirname, "../src/renderer-react/components/launcher-update-settings.jsx")],
  bundle: true, write: false, platform: "node", format: "cjs", packages: "external"
});
const compiled = new Module(__filename, module);
compiled.filename = __filename;
compiled.paths = module.paths;
compiled._compile(output.outputFiles[0].text, __filename);
const { LauncherUpdateSettings } = compiled.exports;
const render = (launcherUpdate) => renderToStaticMarkup(React.createElement(LauncherUpdateSettings, {
  status: { appVersion: "0.2.8.3", launcherUpdate }
}));

test("maintenance does not claim the launcher is current before checking", () => {
  const html = render({ checkedAt: 0, available: false });
  assert.match(html, /Check for updates/);
  assert.match(html, /Check GitHub for the latest launcher version/);
  assert.match(html, /Installed.*0\.2\.8\.3/);
  assert.doesNotMatch(html, /You are on the latest version/);
});

test("maintenance shows the latest version and a direct launcher update action", () => {
  const html = render({ checkedAt: Date.now(), currentVersion: "0.2.8.3", latestVersion: "0.2.8.4", available: true });
  assert.match(html, /Update to 0\.2\.8\.4/);
  assert.match(html, /Latest.*0\.2\.8\.4/);
  const current = render({ checkedAt: Date.now(), currentVersion: "0.2.8.3", latestVersion: "0.2.8.3", available: false });
  assert.match(current, /You are on the latest version/);
  assert.doesNotMatch(current, /Update to/);
});

test("a failed check offers retry instead of an update based on stale information", () => {
  const html = render({ checkedAt: Date.now(), available: true, latestVersion: "0.2.8.4", checkFailed: true });
  assert.match(html, /Could not check for updates/);
  assert.match(html, /Check for updates/);
  assert.doesNotMatch(html, /Update to|You are on the latest version/);
});
