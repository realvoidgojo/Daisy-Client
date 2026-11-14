// Start the real Electron main process and renderer with isolated local state.
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
if (process.platform === "linux" && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
  console.error("Launcher startup requires a display. Run: xvfb-run -a npm run test:startup");
  process.exit(1);
}
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "daisy-smoke-"));
const report = path.resolve(root, "..", "build", "reports", "launcher-smoke.png");
fs.mkdirSync(path.dirname(report), { recursive: true });
const env = { ...process.env, DAISY_SMOKE_TEST: "1", DAISY_SMOKE_DIR: directory, DAISY_SMOKE_REPORT: report };
delete env.ELECTRON_RUN_AS_NODE;
const packaged = process.argv.includes("--packaged");
const executableIndex = process.argv.indexOf("--executable");
const executable = executableIndex >= 0 ? process.argv[executableIndex + 1]
  : packaged ? path.join(root, "dist", process.platform === "win32" ? "win-unpacked/Daisy.exe" : "linux-unpacked/daisy") : require("electron");
if (executableIndex >= 0 && (!packaged || !executable || !path.isAbsolute(executable) || !fs.existsSync(executable))) {
  throw new Error("--executable requires --packaged and an existing absolute executable path.");
}
const args = packaged ? ["--smoke-test"] : [root, "--smoke-test"];
// Hosted CI containers do not install the SUID helper; this exception is test-only.
if (process.platform === "linux" && process.env.CI === "true") args.push("--no-sandbox");
const child = spawn(executable, args, { env, windowsHide: true });
let output = "";
child.stdout.on("data", (chunk) => { output += chunk; process.stdout.write(chunk); });
child.stderr.on("data", (chunk) => process.stderr.write(chunk));
const timer = setTimeout(() => { child.kill(); process.exitCode = 1; }, 45000);
child.on("error", (error) => { console.error(error); process.exitCode = 1; });
child.on("close", (code) => {
  clearTimeout(timer);
  if (code !== 0 || !output.includes("DAISY_SMOKE_OK")) process.exitCode = 1;
  try { fs.rmSync(directory, { recursive: true, force: true, maxRetries: 4, retryDelay: 250 }); }
  catch { console.warn("Temporary smoke state remains at", directory); }
});
