import React, { useCallback, useEffect, useState } from "react";
import { Loader2, HardDrive, FileText, Trash2, Save } from "lucide-react";
import { api } from "../lib/useStatus";
import { Field } from "./shell";
import { Button } from "./ui/button";
import { useT } from "../i18n/context.jsx";
import { Section } from "./settings-section";

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n <= 0) return "0 MB";
  const mb = n / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}

/**
 * getStorageInfo/clearCache/clearLogs/getLogFiles/deleteLogFile/exportLogFile all
 * already existed in main with no Settings surface at all - there was no way to see
 * where disk space was going or to clear any of it short of finding the folders by hand.
 */
export function StorageSection({ notify }) {
  const t = useT();
  const [info, setInfo] = useState(null);
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try {
      const [storageInfo, logFiles] = await Promise.all([api()?.getStorageInfo(), api()?.getLogFiles()]);
      setInfo(storageInfo || null);
      setLogs(Array.isArray(logFiles) ? logFiles : []);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const clearCache = async () => {
    setBusy("cache");
    try {
      const res = await api()?.clearCache();
      notify?.(res?.message || t("Cache cleared."), res?.ok === false ? "error" : "info");
      await load();
    } finally { setBusy(""); }
  };

  const clearLogs = async () => {
    setBusy("logs");
    try {
      const res = await api()?.clearLogs();
      notify?.(res?.message || t("Logs cleared."), res?.ok === false ? "error" : "info");
      await load();
    } finally { setBusy(""); }
  };

  const deleteLog = async (file) => {
    setBusy(file.path);
    try {
      const res = await api()?.deleteLogFile(file.path);
      if (res?.ok === false) notify?.(res.message || t("Could not delete that log."), "error");
      await load();
    } finally { setBusy(""); }
  };

  const exportLog = async (file) => {
    try {
      const res = await api()?.exportLogFile(file.path);
      if (res && res.message && res.message !== "Export cancelled.") notify?.(res.message, res.ok === false ? "error" : "info");
    } catch (e) { notify?.(String(e?.message || e), "error"); }
  };

  const total = (info?.instanceSize || 0) + (info?.cacheSize || 0) + (info?.logsSize || 0);

  return (
    <Section title={t("Storage")}>
      <div className="flex items-center justify-between gap-6 py-2.5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <HardDrive className="size-3.5 text-muted-foreground" />
          {t("Used by Daisy Client")}
        </div>
        <span className="font-mono text-xs text-muted-foreground">{formatBytes(total)}</span>
      </div>

      <Field label={t("Instance files")} hint={t("Mods, worlds, packs, shaders")}>
        <span className="font-mono text-xs text-muted-foreground">{formatBytes(info?.instanceSize)}</span>
      </Field>

      <Field label={t("Cache")} hint={t("Mod metadata and thumbnails")}>
        <span className="font-mono text-xs text-muted-foreground">{formatBytes(info?.cacheSize)}</span>
        <Button variant="outline" size="sm" disabled={busy === "cache"} onClick={clearCache}>
          {busy === "cache" ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
          {t("Clear")}
        </Button>
      </Field>

      <Field label={t("Logs")} hint={`${logs.length} file${logs.length === 1 ? "" : "s"} from past sessions.`}>
        <span className="font-mono text-xs text-muted-foreground">{formatBytes(info?.logsSize)}</span>
        <Button variant="outline" size="sm" onClick={() => setShowLogs((v) => !v)}>
          <FileText className="size-3.5" />
          {showLogs ? t("Hide") : t("View")}
        </Button>
        <Button variant="outline" size="sm" disabled={busy === "logs" || !logs.length} onClick={clearLogs}>
          {busy === "logs" ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
          {t("Clear")}
        </Button>
      </Field>

      {showLogs ? (
        <div className="space-y-1 py-2.5">
          {logs.length ? logs.slice(0, 8).map((file) => (
            <div key={file.path} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-1.5">
              <span className="truncate text-xs">{file.file}</span>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                <button title={t("Export")} onClick={() => exportLog(file)} className="text-muted-foreground hover:text-foreground">
                  <Save className="size-3.5" />
                </button>
                <button
                  title={t("Delete")}
                  disabled={busy === file.path}
                  onClick={() => deleteLog(file)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  {busy === file.path ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                </button>
              </div>
            </div>
          )) : (
            <p className="py-1 text-xs text-muted-foreground">{t("No log files yet.")}</p>
          )}
        </div>
      ) : null}
    </Section>
  );
}

