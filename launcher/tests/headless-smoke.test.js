const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("headless Linux startup fails before spawning or creating state and explains xvfb", () => {
  const source = fs.readFileSync(path.join(__dirname, "../scripts/smoke-launcher.js"), "utf8");
  const messages = [];
  const sentinel = new Error("exited");
  assert.throws(() => vm.runInNewContext(source.slice(0, source.indexOf("const directory =")), {
    require, __dirname: path.join(__dirname, "../scripts"),
    console: { error: message => messages.push(message) },
    process: { platform: "linux", env: {}, exit: code => { assert.equal(code, 1); throw sentinel; } }
  }), error => error === sentinel);
  assert.match(messages.join("\n"), /xvfb-run -a npm run test:startup/);
});
