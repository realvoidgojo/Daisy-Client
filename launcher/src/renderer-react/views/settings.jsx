import React, { useEffect, useState } from "react";
import { Loader2, FolderOpen, RotateCcw, Download, GraduationCap, HardDrive, UserRound, Palette, Gamepad2, Rocket, Wrench } from "lucide-react";
import { api } from "../lib/useStatus";
import { Page, Field } from "../components/shell";
import { cn } from "../lib/utils";
import { useModern } from "../lib/ui-style";
import { pickableSeasons } from "../lib/seasons";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Switch } from "../components/ui/switch";
import { Slider } from "../components/ui/slider";
import { Separator } from "../components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { LauncherUpdateSettings } from "../components/launcher-update-settings";
import { useT } from "../i18n/context.jsx";
import { SUPPORTED_LANGUAGES } from "../i18n/translate.js";
import { Section } from "../components/settings-section";
import { StorageSection } from "../components/settings-storage";
import { LocalAccountManager } from "../components/local-account-manager";

export function SettingsView({ status, refresh, notify, startTour }) {
  const t = useT();
  const settings = status?.settings || {};
  const modern = useModern();
  const [memoryMb, setMemoryMb] = useState(settings.memoryMb || 4096);
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState("account");

  // Track the backend value unless the user is mid-drag on the slider.
  useEffect(() => { setMemoryMb(settings.memoryMb || 4096); }, [settings.memoryMb]);

  const maxMemoryMb = Math.max(2048, Number(status?.memoryLimitMb) || 8192);
  const recommended = Number(status?.recommendedMemoryMb) || 0;

  const patch = async (next) => {
    setBusy(true);
    try { await api()?.updateSettings(next); await refresh(); }
    catch (e) { notify(String(e?.message || e), "error"); }
    finally { setBusy(false); }
  };

  const pickFolder = async () => {
    const res = await api()?.pickFolder({});
    const dir = typeof res === "string" ? res : res?.path;
    if (dir) await patch({ instancePath: dir });
  };

  const signedIn = Boolean(status?.auth?.signedIn);

  const sections = [
    { id: "account", title: t("Account"), icon: UserRound, body: (
        <LocalAccountManager status={status} refresh={refresh} notify={notify} />
      ) },
    { id: "appearance", title: t("Appearance"), icon: Palette, body: (
        <>
          <Field label={t("Language")}>
            <Select
              value={settings.launcherLanguage === "cs" ? "cs" : "en"}
              onValueChange={(v) => patch({ launcherLanguage: v })}
            >
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("Theme")}>
            <Select
              value={settings.launcherTheme === "light" ? "light" : pickableSeasons(settings.keptSeasons || []).some((s) => s.id === settings.launcherTheme) ? settings.launcherTheme : "dark"}
              onValueChange={(v) => patch({ launcherTheme: v })}
            >
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">{t("Dark")}</SelectItem>
                <SelectItem value="light">{t("Light")}</SelectItem>
                {pickableSeasons(settings.keptSeasons || []).map((s) => <SelectItem key={s.id} value={s.id}>{t(s.label)}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label={t("Interface size")}
            hint={t("Auto fits your monitor")}
          >
            <Select value={settings.uiScale || "auto"} onValueChange={(v) => patch({ uiScale: v })}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{t("Auto")}</SelectItem>
                {["90", "100", "110", "125", "150", "175", "200"].map((v) => (
                  <SelectItem key={v} value={v}>{v}%</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </>
      ) },
    { id: "game", title: t("Game"), icon: Gamepad2, body: (
        <>
          <div className="py-3">
            <div className="flex items-center justify-between gap-6">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">{t("Memory")}</div>
                <div className="text-xs text-muted-foreground">
                  {(memoryMb / 1024).toFixed(1)} {t("GB allocated")}
                  {recommended ? ` · ${(recommended / 1024).toFixed(1)} ${t("GB recommended")}` : ""}
                </div>
              </div>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {Math.round(maxMemoryMb / 1024)} {t("GB max")}
              </span>
            </div>
            <Slider
              className="mt-3"
              min={1024}
              max={maxMemoryMb}
              step={512}
              value={[memoryMb]}
              onValueChange={([v]) => setMemoryMb(v)}
              onValueCommit={([v]) => patch({ memoryMb: v })}
            />
          </div>

          <Field label={t("Game folder")} hint={settings.instancePath || ""}>
            <Button variant="outline" size="sm" onClick={pickFolder} disabled={busy}>
              <FolderOpen className="size-3.5" />
              {t("Change")}
            </Button>
          </Field>

          <Field label={t("Java path")} hint={t("Blank uses the bundled runtime")}>
            <Input
              className="w-64"
              defaultValue={settings.javaPath || ""}
              placeholder={t("Automatic")}
              onBlur={(e) => {
                const next = e.target.value.trim();
                if (next !== (settings.javaPath || "")) patch({ javaPath: next });
              }}
            />
          </Field>

          <Field label={t("Window size")}>
            <Select
              value={settings.windowPreset || "1280x720"}
              onValueChange={(v) => patch({ windowPreset: v })}
            >
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["1280x720", "1600x900", "1920x1080", "2560x1440"].map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("Fullscreen")}>
            <Switch checked={Boolean(settings.fullscreen)} onCheckedChange={(v) => patch({ fullscreen: v })} />
          </Field>
        </>
      ) },
    { id: "launcher", title: t("Launcher"), icon: Rocket, body: (
        <>
          <Field label={t("Start with Windows")} hint={t("Opens minimized when you sign in")}>
            <Switch checked={Boolean(settings.launchOnStartup)} onCheckedChange={(v) => patch({ launchOnStartup: v })} />
          </Field>

          <Field label={t("Game log window")} hint={t("Separate window at launch")}>
            <Switch
              checked={settings.showGameLogWindow !== false}
              onCheckedChange={(v) => patch({ showGameLogWindow: v })}
            />
          </Field>

          <Field label={t("Keep launcher open")}>
            <Switch checked={Boolean(settings.keepLauncherOpen)} onCheckedChange={(v) => patch({ keepLauncherOpen: v })} />
          </Field>

          <Field label={t("Close to tray")} hint={t("Minimize instead of quit")}>
            <Switch checked={settings.closeToTray !== false} onCheckedChange={(v) => patch({ closeToTray: v })} />
          </Field>

          <Field label={t("Message notifications")} hint={t("Only when the game is closed")}>
            <Switch
              checked={settings.dmNotifications !== false}
              onCheckedChange={(v) => patch({ dmNotifications: v })}
            />
          </Field>

          <Field label={t("Discord presence")}>
            <Switch checked={settings.discordRpc !== false} onCheckedChange={(v) => patch({ discordRpc: v })} />
          </Field>

          <Field label={t("Automatic update checks")} hint={t("On startup")}>
            <Switch checked={settings.autoCheckUpdates !== false} onCheckedChange={(v) => patch({ autoCheckUpdates: v })} />
          </Field>
        </>
      ) },
    { id: "storage", title: t("Storage"), icon: HardDrive, own: true },
    { id: "maintenance", title: t("Maintenance"), icon: Wrench, body: (
        <>
          <LauncherUpdateSettings status={status} notify={notify} refresh={refresh} />

          <Field label={t("Releases")} hint={t("Client JARs and launcher downloads")}>
            <Button variant="outline" size="sm" onClick={() => api()?.openExternal("https://github.com/realvoidgojo/Daisy-Client/releases")}>
              <Download className="size-3.5" />{t("View releases")}
            </Button>
          </Field>

          <Field label={t("Tutorial")} hint={t("Replay the tour")}>
            <Button variant="outline" size="sm" onClick={() => startTour?.()}>
              <GraduationCap className="size-3.5" />
              {t("Show tutorial")}
            </Button>
          </Field>

          <Field label={t("Repair all instances")} hint={t("Re-verify game files")}>
            <Button variant="outline" size="sm" disabled={busy} onClick={async () => {
              setBusy(true);
              try {
                const res = await api()?.repairAll();
                notify(res?.ok === false ? (res.message || t("Repair failed.")) : t("Repair complete."), res?.ok === false ? "error" : "info");
                await refresh();
              } finally { setBusy(false); }
            }}>
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {t("Repair")}
            </Button>
          </Field>

          <Field label={t("Reset settings")}>
            <Button variant="outline" size="sm" disabled={busy} onClick={async () => {
              setBusy(true);
              try { await api()?.resetSettings(); await refresh(); notify(t("Settings reset."), "info"); }
              finally { setBusy(false); }
            }}>
              <RotateCcw className="size-3.5" />
              {t("Reset")}
            </Button>
          </Field>
        </>
      ) }
  ];
  const draw = (entry) => (entry.own
    ? <StorageSection key={entry.id} notify={notify} />
    : <Section key={entry.id} title={entry.title}>{entry.body}</Section>);

  /*
    Modern: one category at a time, picked from a list on the left, instead of one long page.
    The categories are the same sections Classic stacks, so nothing exists in only one layout.
  */
  if (modern) {
    const active = sections.find((entry) => entry.id === section) || sections[0];
    return (
      <Page title={t("Settings")} description={`Daisy Client ${status?.version || ""}`.trim()}>
        <div className="flex items-start gap-8">
          <nav className="sticky top-0 flex w-52 shrink-0 flex-col gap-1.5" aria-label={t("Settings")}>
            {sections.map((entry) => {
              const Icon = entry.icon;
              const on = entry.id === active.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  aria-current={on ? "page" : undefined}
                  onClick={() => setSection(entry.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border-2 px-3.5 py-2.5 text-left text-sm font-bold transition-all",
                    on
                      ? "border-primary bg-primary/20 text-primary shadow-[2px_2px_0px_#080808]"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-accent/60 hover:text-foreground"
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", on ? "text-primary" : "")} />
                  {entry.title}
                </button>
              );
            })}
            <p className="mt-4 px-3 text-[11px] font-medium text-muted-foreground">{t("Daisy Client by realvoidgojo")}</p>
          </nav>
          <div className="min-w-0 max-w-3xl flex-1">{draw(active)}</div>
        </div>
      </Page>
    );
  }

  return (
    <Page title={t("Settings")} description={`Daisy Client ${status?.version || ""}`.trim()}>
      <div className="space-y-6">
        {sections.map(draw)}

        <Separator />
        <p className="pb-2 text-center text-xs text-muted-foreground">{t("Daisy Client by realvoidgojo")}</p>
      </div>
    </Page>
  );
}
