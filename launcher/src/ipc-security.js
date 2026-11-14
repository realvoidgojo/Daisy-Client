const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { archiveRelativePath, archiveTarget } = require("./archive-safety.js");

const EXTERNAL_HOSTS = new Set([
  "github.com", "modrinth.com", "curseforge.com", "www.curseforge.com",
  "discord.com", "discord.gg", "daisyclient.xyz", "www.daisyclient.xyz"
]);

function externalUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port || !EXTERNAL_HOSTS.has(url.hostname)) {
    throw new Error("This external link is not allowed.");
  }
  return url.href;
}

function contained(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function contentPath(instance, folder, filename) {
  const name = archiveRelativePath(filename);
  if (name.includes("/")) throw new Error("Content operations require a filename, not a path.");
  return archiveTarget(instance, `${folder}/${name}`);
}

// Check both spelling and actual filesystem identity. A directory junction inside
// an approved root must not turn a file operation into access outside that root.
function approvedPath(value, roots, { extensions, directoryOnly = false } = {}) {
  if (typeof value !== "string" || !path.isAbsolute(value) || /[\x00-\x1f<>"|?*]/.test(value)
      || value.replace(/^[A-Za-z]:/, "").includes(":") || /^\\\\[.?]\\/.test(value)) throw new Error("Invalid local path.");
  const target = path.resolve(value);
  const realTarget = fs.realpathSync(target);
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink() || (!stat.isDirectory() && (!stat.isFile() || stat.nlink > 1))) throw new Error("Linked files are not allowed.");
  const allowed = roots.filter(Boolean).some((root) => {
    try {
      const absoluteRoot = path.resolve(root);
      if (!contained(absoluteRoot, target) || !contained(fs.realpathSync(absoluteRoot), realTarget)) return false;
      let current = target;
      const components = path.relative(absoluteRoot, target).split(path.sep).filter(Boolean);
      for (let index = 0; index < components.length; index++) {
        if (fs.lstatSync(current).isSymbolicLink()) return false;
        current = path.dirname(current);
      }
      return true;
    } catch { return false; }
  });
  if (!allowed || (directoryOnly && !stat.isDirectory()) || (extensions && (!stat.isFile() || !extensions.includes(path.extname(target).toLowerCase())))) {
    throw new Error("The path is outside the permitted folders or file types.");
  }
  return target;
}

async function ensureApprovedDirectory(value, roots) {
  if (typeof value !== "string" || !path.isAbsolute(value)) throw new Error("Invalid folder.");
  let ancestor = path.resolve(value);
  while (!fs.existsSync(ancestor)) {
    const parent = path.dirname(ancestor);
    if (parent === ancestor) throw new Error("Folder has no permitted ancestor.");
    ancestor = parent;
  }
  approvedPath(ancestor, roots, { directoryOnly: true });
  await fs.promises.mkdir(value, { recursive: true });
  return approvedPath(value, roots, { directoryOnly: true });
}

function createIpcRegistrar(ipcMain, getWindows, rendererDirectory) {
  const pages = new Map(["index", "logs", "updater"].map((name) => [pathToFileURL(path.join(rendererDirectory, `${name}.html`)).href, name]));
  return (channel, handler) => ipcMain.handle(channel, (event, ...args) => {
    const sender = event.sender;
    const frame = event.senderFrame;
    const known = getWindows().some((window) => window && !window.isDestroyed() && window.webContents === sender);
    const page = frame && pages.get(frame.url);
    const permitted = page === "index" || (page === "logs" && ["logs:ready", "logs:copy", "logs:open-folder", "logs:window"].includes(channel))
      || (page === "updater" && ["launcher:retry-updater", "launcher:report-update-stuck", "launcher:window"].includes(channel));
    if (!known || !frame || frame !== sender.mainFrame || !permitted) throw new Error("Untrusted IPC sender.");
    return handler(event, ...args);
  });
}

function hardenWindow(window, rendererDirectory) {
  const pages = new Set(["index", "logs", "updater"].map((name) => pathToFileURL(path.join(rendererDirectory, `${name}.html`)).href));
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => { if (!pages.has(url)) event.preventDefault(); });
  window.webContents.on("will-attach-webview", (event) => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  window.webContents.session.setPermissionCheckHandler(() => false);
}

module.exports = { externalUrl, contentPath, approvedPath, ensureApprovedDirectory, createIpcRegistrar, hardenWindow };
