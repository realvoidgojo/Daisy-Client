import React, { useState } from "react";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { api } from "../lib/useStatus";
import { useModern } from "../lib/ui-style";
import { useT } from "../i18n/context.jsx";
import { Button } from "./ui/button";

export function LauncherUpdateSettings({ status, notify, refresh }) {
  const t = useT();
  const modern = useModern();
  const [result, setResult] = useState(null);
  const [action, setAction] = useState("");
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const pushed = status?.launcherUpdate;
  const update = result && (!pushed || result.checkedAt >= pushed.checkedAt) ? result : pushed;
  const installed = update?.currentVersion || status?.appVersion || "—";
  const latest = update?.latestVersion || "—";
  const busy = Boolean(action);

  const check = async () => {
    setAction("check");
    setMessage("");
    setFailed(false);
    try {
      const bridge = api();
      if (!bridge?.checkLauncherUpdates) throw new Error(t("Launcher update service is unavailable."));
      const next = await bridge.checkLauncherUpdates();
      if (!next) throw new Error(t("The update server returned no result."));
      setResult(next);
      if (next.checkFailed) throw new Error(next.message || t("Could not check for updates. Try again."));
      notify?.(next.available
        ? t("Daisy Client {version} is available.", { version: next.latestVersion })
        : t("You are up to date."), "info");
      await refresh?.();
    } catch (error) {
      setFailed(true);
      setMessage(error.message);
      notify?.(error.message, "error");
    } finally { setAction(""); }
  };

  const install = async () => {
    setAction("install");
    setMessage("");
    setFailed(false);
    try {
      const bridge = api();
      if (!bridge?.installLauncherUpdate) throw new Error(t("Launcher update service is unavailable."));
      const response = await bridge.installLauncherUpdate();
      if (!response || response.ok === false) throw new Error(response?.message || t("The update could not be installed."));
      setMessage(response.message || t("Update downloaded."));
      notify?.(response.message, "info");
      await refresh?.();
    } catch (error) {
      setFailed(true);
      setMessage(error.message);
      notify?.(error.message, "error");
    } finally { setAction(""); }
  };

  const detail = message || (action === "check" ? t("Checking GitHub for the latest release…")
    : action === "install" ? t("Downloading and verifying the launcher update…")
    : update?.checkFailed ? t("Could not check for updates. Try again.")
    : !update?.checkedAt ? t("Check GitHub for the latest launcher version.")
    : update.available ? t("An update is available.") : t("You are on the latest version."));

  return (
    <div className={`flex flex-wrap items-center justify-between gap-4 ${modern ? "py-3.5" : "py-2.5"}`}>
      <div className="min-w-0 flex-1 space-y-1" aria-live="polite" aria-busy={busy}>
        <div className="text-sm font-semibold">{t("Launcher updates")}</div>
        <div className="text-xs text-muted-foreground">
          {t("Installed")}: {installed} <span aria-hidden="true">·</span> {t("Latest")}: {latest}
        </div>
        <div className={`text-xs ${failed || update?.checkFailed ? "text-destructive" : "text-muted-foreground"}`} role="status">{detail}</div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" disabled={busy} onClick={check}>
          {action === "check" ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          {action === "check" ? t("Checking…") : t("Check for updates")}
        </Button>
        {update?.available && !update.checkFailed && !failed ? (
          <Button size="sm" disabled={busy} onClick={install}>
            {action === "install" ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            {action === "install" ? t("Downloading…") : t("Update to {version}", { version: latest })}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
