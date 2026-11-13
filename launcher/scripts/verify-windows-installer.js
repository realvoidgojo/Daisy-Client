// Actual NSIS installation/startup test. Never run against a developer's installed app.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
if (process.platform !== "win32" || process.env.GITHUB_ACTIONS !== "true"
    || process.env.RUNNER_ENVIRONMENT !== "github-hosted") {
  throw new Error("Installer verification is restricted to isolated GitHub-hosted Windows runners.");
}
const root = path.resolve(__dirname, "..");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "daisy-install-smoke-"));
const installed = path.join(temporary, "Daisy Launcher");
try {
  // Omit --force-run here so startup can be exercised with explicit isolated smoke
  // state; production passes it to reopen the user's updated launcher.
  const result = spawnSync(path.join(root, "dist", "Daisy-Setup.exe"),
    ["--updated", "/S", `/D=${installed}`], { windowsHide: true, encoding: "utf8", timeout: 180000 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Silent installer exited with ${result.status}: ${result.stderr}`);
  const executable = path.join(installed, "Daisy.exe");
  if (!fs.existsSync(executable)) throw new Error("Silent installer did not populate the requested installation directory.");
  const startup = spawnSync(process.execPath, [path.join(__dirname, "smoke-launcher.js"), "--packaged", "--executable", executable],
    { windowsHide: true, encoding: "utf8", timeout: 65000 });
  process.stdout.write(startup.stdout || "");
  process.stderr.write(startup.stderr || "");
  if (startup.error) throw startup.error;
  if (startup.status !== 0) throw new Error(`Installed launcher smoke exited with ${startup.status}`);
  console.log("Verified silent Windows installation and installed launcher startup with isolated data.");
} finally {
  fs.rmSync(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
}
