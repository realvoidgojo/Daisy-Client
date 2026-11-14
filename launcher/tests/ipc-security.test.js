const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { approvedPath, externalUrl, createIpcRegistrar, contentPath, hardenWindow } = require("../src/ipc-security.js");

test("file access rejects sibling-prefix escapes, hardlinks, junctions and unsafe extensions", (t) => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "daisy-ipc-"));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const logs = path.join(temp, "logs");
  const outside = path.join(temp, "logs-other");
  fs.mkdirSync(logs); fs.mkdirSync(outside);
  const log = path.join(logs, "latest.log");
  const canary = path.join(outside, "private.log");
  fs.writeFileSync(log, "log"); fs.writeFileSync(canary, "private");
  assert.equal(approvedPath(log, [logs], { extensions: [".log"] }), log);
  if (process.platform === "win32") assert.equal(approvedPath(log.toLowerCase(), [logs]), log.toLowerCase());
  assert.throws(() => approvedPath(`${log}:hidden.log`, [logs]));
  assert.throws(() => contentPath(temp, "logs", "../private.txt"));
  assert.throws(() => contentPath(temp, "logs", "nested/file.jar"));
  assert.equal(contentPath(temp, "logs", "latest.log"), log);
  assert.throws(() => approvedPath(canary, [logs]));
  fs.linkSync(canary, path.join(logs, "hard.log"));
  assert.throws(() => approvedPath(path.join(logs, "hard.log"), [logs]));
  fs.symlinkSync(outside, path.join(logs, "linked"), process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => approvedPath(path.join(logs, "linked", "private.log"), [logs]));
  fs.writeFileSync(path.join(logs, "run.exe"), "executable");
  assert.throws(() => approvedPath(path.join(logs, "run.exe"), [logs], { extensions: [".log"] }));
  assert.equal(fs.readFileSync(canary, "utf8"), "private");
});

test("actual log deletion IPC refuses an outside file and deletes an approved log", async (t) => {
  const vm = require("node:vm");
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "daisy-log-ipc-"));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const logs = path.join(temp, "logs"); fs.mkdirSync(logs);
  const canary = path.join(temp, "private.txt"); fs.writeFileSync(canary, "keep");
  const log = path.join(logs, "latest.log"); fs.writeFileSync(log, "log");
  const source = fs.readFileSync(path.join(__dirname, "../src/main.js"), "utf8");
  const start = source.indexOf('handleIpc("launcher:delete-log-file"');
  const end = source.indexOf('handleIpc("launcher:export-log-file"', start);
  let handler;
  vm.runInNewContext(source.slice(start, end), {
    handleIpc: (_channel, callback) => { handler = callback; },
    approvedPath, approvedLogRoots: () => [logs], fsp: fs.promises, path, invalidateStorageScans: () => {}
  });
  assert.equal((await handler(null, canary)).ok, false);
  assert.equal(fs.readFileSync(canary, "utf8"), "keep");
  assert.equal((await handler(null, log)).ok, true);
  assert.equal(fs.existsSync(log), false);
});

test("OS links accept HTTPS product domains and reject protocol, credential and hostname tricks", () => {
  assert.equal(externalUrl("https://github.com/realvoidgojo/Daisy-Client/releases"), "https://github.com/realvoidgojo/Daisy-Client/releases");
  for (const url of ["file:///C:/Windows/notepad.exe", "javascript:alert(1)", "ms-settings:privacy", "http://github.com", "https://localhost", "https://127.0.0.1", "https://github.com.evil.test", "https://github.com@evil.test", "https://user:pass@github.com", "https://github.com:8443"]) {
    assert.throws(() => externalUrl(url), url);
  }
});

test("IPC rejects unknown webContents, remote frames, subframes and cross-window capabilities", () => {
  const handlers = new Map();
  const directory = path.join(os.tmpdir(), "renderer");
  const sender = { mainFrame: { url: pathToFileURL(path.join(directory, "index.html")).href } };
  const window = { isDestroyed: () => false, webContents: sender };
  const register = createIpcRegistrar({ handle: (channel, handler) => handlers.set(channel, handler) }, () => [window], directory);
  register("launcher:delete-log-file", () => "allowed");
  const invoke = (event) => handlers.get("launcher:delete-log-file")(event);
  assert.equal(invoke({ sender, senderFrame: sender.mainFrame }), "allowed");
  assert.throws(() => invoke({ sender: { mainFrame: sender.mainFrame }, senderFrame: sender.mainFrame }));
  assert.throws(() => invoke({ sender, senderFrame: { ...sender.mainFrame } }));
  sender.mainFrame.url = "https://github.com";
  assert.throws(() => invoke({ sender, senderFrame: sender.mainFrame }));
  sender.mainFrame.url = pathToFileURL(path.join(directory, "logs.html")).href;
  assert.throws(() => invoke({ sender, senderFrame: sender.mainFrame }));
  register("logs:copy", () => "copied");
  assert.equal(handlers.get("logs:copy")({ sender, senderFrame: sender.mainFrame }), "copied");
  sender.mainFrame.url = pathToFileURL(path.join(directory, "updater.html")).href;
  assert.throws(() => handlers.get("logs:copy")({ sender, senderFrame: sender.mainFrame }));
  register("launcher:retry-updater", () => "retried");
  assert.equal(handlers.get("launcher:retry-updater")({ sender, senderFrame: sender.mainFrame }), "retried");
});

test("windows deny remote navigation, new windows, webviews and permissions", () => {
  const callbacks = new Map();
  const session = {};
  const contents = {
    session, on: (name, callback) => callbacks.set(name, callback),
    setWindowOpenHandler: callback => callbacks.set("open", callback)
  };
  session.setPermissionRequestHandler = callback => callbacks.set("request", callback);
  session.setPermissionCheckHandler = callback => callbacks.set("permission", callback);
  const directory = path.join(os.tmpdir(), "renderer");
  hardenWindow({ webContents: contents }, directory);
  assert.equal(callbacks.get("open")().action, "deny");
  let cancelled = false;
  const event = { preventDefault: () => { cancelled = true; } };
  callbacks.get("will-navigate")(event, "https://github.com");
  assert.ok(cancelled);
  cancelled = false;
  callbacks.get("will-navigate")(event, pathToFileURL(path.join(directory, "index.html")).href);
  assert.equal(cancelled, false);
  callbacks.get("will-attach-webview")(event);
  assert.ok(cancelled);
  assert.equal(callbacks.get("permission")(), false);
  callbacks.get("request")(contents, "geolocation", allowed => assert.equal(allowed, false));
});

test("existing copy buttons use a bounded IPC write without granting clipboard read permission", () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/main.js"), "utf8");
  const start = source.indexOf('handleIpc("launcher:copy-text"');
  const copied = [];
  let handler;
  require("node:vm").runInNewContext(source.slice(start, source.indexOf('handleIpc("launcher:get-status"', start)), {
    handleIpc: (_channel, callback) => { handler = callback; }, Buffer,
    clipboard: { writeText: text => copied.push(text) }
  });
  assert.equal(handler(null, "friend-code"), true);
  assert.equal(handler(null, "x".repeat(256 * 1024 + 1)), false);
  assert.equal(handler(null, {}), false);
  assert.deepEqual(copied, ["friend-code"]);
});
