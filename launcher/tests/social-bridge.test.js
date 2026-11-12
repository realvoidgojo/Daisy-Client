const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("current and compatibility social bridges reach the same working handler", async () => {
  const handlers = new Map();
  const calls = [];
  const main = fs.readFileSync(path.join(__dirname, "../src/main.js"), "utf8");
  const start = main.indexOf("async function handleDaisySocial(");
  const end = main.indexOf("/** Username to", start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(main.slice(start, end), {
    ipcMain: { handle: (channel, handler) => {
      assert.equal(handlers.has(channel), false, `Duplicate IPC handler: ${channel}`);
      handlers.set(channel, handler);
    } },
    readSettings: () => ({ socialStatus: "online" }),
    daisySocialCall: async (route, payload) => { calls.push({ route, payload }); return { ok: true }; }
  });
  let bridge;
  const preload = fs.readFileSync(path.join(__dirname, "../src/preload.js"), "utf8");
  vm.runInNewContext(preload, {
    require: () => ({
      contextBridge: { exposeInMainWorld: (_name, value) => { bridge = value; } },
      ipcRenderer: {
        invoke: (channel, request) => {
          assert.ok(handlers.has(channel), `Missing IPC handler: ${channel}`);
          return handlers.get(channel)(null, request);
        }
      }
    })
  });
  assert.equal((await bridge.daisySocial("roster")).ok, true);
  assert.equal((await bridge.riverSocial("roster")).ok, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].route, "/presence");
  assert.equal(calls[1].payload.status, "online");
});
