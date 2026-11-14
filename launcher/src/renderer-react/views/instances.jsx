import React, { useEffect, useState } from "react";
import { Boxes, Package, Plus, Check, Folder, Copy, Wrench, Trash2, Loader2, Download, Upload, Blocks, TriangleAlert, Pencil, MoreHorizontal, MousePointerClick, Gauge } from "lucide-react";
import { api } from "../lib/useStatus";
import { cn } from "../lib/utils";
import { Page, EmptyState } from "../components/shell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { ContentDialog } from "../components/content-browser";
import { ImportInstancesDialog } from "../components/import-instances";
import { ModernInstanceCard } from "../components/instance-card";
import { InstanceArt, PlayBlock, useInstanceCards } from "../components/instance-art";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { Select } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { useModern } from "../lib/ui-style";
import { useT } from "../i18n/context.jsx";
import { LoaderPicker, usePlainVersions, PlainVersionSelect, ElegantVersionPicker, loaderOption, loaderPrefix } from "../components/instance-version-picker";
export { loaderName } from "../components/instance-version-picker";
import { RepairResultDialog } from "../components/repair-result-dialog";

function CreateInstanceDialog({ open, onOpenChange, onCreated, notify, versions }) {
  const t = useT();
  const modern = useModern();
  const available = Array.isArray(versions) && versions.length
    ? versions
    : [{ id: "1.21.11", status: "Primary" }, { id: "1.21.4", status: "Supported" }];
  const defaultVersion = available.find((v) => v.selected)?.id || available[0].id;
  const [name, setName] = useState("");
  const [loader, setLoader] = useState("daisy");
  const [fabricVersion, setFabricVersion] = useState(defaultVersion);
  const [plainPick, setPlainPick] = useState({});
  const [busy, setBusy] = useState(false);
  const plain = usePlainVersions(open, loader);

  // Reset the picked version to the current default each time the dialog opens.
  useEffect(() => { if (open) { setFabricVersion(defaultVersion); setLoader("daisy"); } }, [open, defaultVersion]);

  // Forge defaults to the newest version with a recommended build, vanilla to the newest release.
  const plainEntry = plain.list
    ? plain.list.find((v) => v.id === plainPick[loader]) || plain.list.find((v) => v.recommended) || plain.list[0]
    : null;
  const version = loader === "daisy" ? fabricVersion : plainEntry?.id || "";
  const setVersion = (id) => (loader === "daisy" ? setFabricVersion(id) : setPlainPick((prev) => ({ ...prev, [loader]: id })));
  const tag = loader === "vanilla" ? version : `${loader === "daisy" ? "Fabric" : loaderOption(loader).label} ${version}`;
  const placeholder = `${loaderPrefix(loader)} ${version}`.trim();
  const description = loader === "daisy"
    ? t("A separate mods, worlds and settings folder on its own Fabric version.")
    : loader === "fabric"
      ? t("Plain Fabric with your own mods, without Daisy in game.")
      : loader === "forge" || loader === "neoforge" || loader === "quilt"
      ? t("Plain {loader} with your own mods, without Daisy in game.", { loader: loaderOption(loader).label })
        : t("Plain Minecraft, without Daisy in game.");

  const [installNow, setInstallNow] = useState(true);
  const [daisySkin, setDaisySkin] = useState(false);

  const create = async () => {
    if (!version) return;
    setBusy(true);
    try {
      const res = await api()?.createInstance({
        name: name.trim() || undefined,
        version,
        loader: loaderOption(loader).loader,
        daisy: loader === "daisy",
        daisySkin: loader === "fabric" && daisySkin,
        loaderVersion: loader === "daisy" || loader === "vanilla" ? undefined : plainEntry?.loaderVersion
      });
      if (res && res.ok === false) {
        notify(res.message || t("Could not create the instance."), "error");
        return;
      }
      if (installNow) {
        notify(t("Installing Minecraft {version} assets and libraries...", { version }), "info");
        api()?.installInstanceVersion?.({
          version,
          loader: loaderOption(loader).loader,
          loaderVersion: plainEntry?.loaderVersion
        }).then((instRes) => {
          if (instRes?.ok) {
            notify(t("Minecraft {version} installed successfully!", { version }), "success");
          } else {
            notify(instRes?.message || t("Installation failed."), "error");
          }
        }).catch((err) => {
          notify(String(err?.message || err), "error");
        });
      }
      onOpenChange(false);
      setName("");
      onCreated?.();
    } catch (e) {
      notify(String(e?.message || e), "error");
    } finally {
      setBusy(false);
    }
  };

  /*
    Modern: the top of the dialog previews the card the new instance will get (picture,
    version and name, updating as you type), and versions are grouped by release line with
    the recommended one marked, instead of twelve identical buttons in a grid.
  */
  if (modern) {
    const shownName = name.trim() || placeholder;
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
          <div className="relative h-32 overflow-hidden">
            <InstanceArt instanceId={shownName} />
            <div className="absolute inset-0 bg-gradient-to-t from-popover via-popover/45 to-popover/5" />
            <div className="absolute inset-x-6 bottom-4 min-w-0">
              <p className="m-kicker text-primary">{t("New instance")}</p>
              <div className="mt-2 flex min-w-0 items-center gap-2.5">
                <span className="truncate text-xl font-extrabold tracking-[-0.015em]">{shownName}</span>
                {version ? <span className="shrink-0 rounded-md bg-background/85 px-2 py-1 text-[11px] font-semibold">{tag}</span> : null}
              </div>
            </div>
          </div>

          <div className="space-y-5 p-6">
            <DialogHeader>
              <DialogTitle className="sr-only">{t("New instance")}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label>{t("Loader")}</Label>
              <LoaderPicker loader={loader} onChange={setLoader} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instance-name">{t("Name")}</Label>
              <Input
                id="instance-name"
                value={name}
                placeholder={placeholder}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !busy) create(); }}
              />
            </div>

            <ElegantVersionPicker
              loader={loader}
              value={version}
              onChange={setVersion}
              available={available}
              plainList={plain.list}
              plainError={plain.error}
            />

            
            {/* Daisy Skin feature toggle for Fabric-based loaders */}
            <div
              className={cn(
                "flex items-center justify-between rounded-xl border-2 border-border/70 bg-card/70 px-3.5 py-2.5 shadow-[2px_2px_0px_#080808] transition-opacity",
                (loader === "daisy" || loader === "fabric") ? "opacity-100" : "opacity-35 pointer-events-none"
              )}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="daisy-skin-toggle" className="text-xs font-bold">{t("Daisy Skin")}</Label>
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/60 font-bold">{t("Client-side")}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">{t(loader === "daisy" ? "Local skins are included with Daisy." : "Use your wardrobe skin for the local player. Works offline after setup.")}</p>
              </div>
              <Switch
                id="daisy-skin-toggle"
                disabled={loader !== "fabric"}
                checked={loader === "daisy" || (loader === "fabric" && daisySkin)}
                onCheckedChange={setDaisySkin}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border-2 border-border/70 bg-card/70 px-3.5 py-2.5 shadow-[2px_2px_0px_#080808]">
              <div className="space-y-0.5">
                <Label htmlFor="install-now-toggle" className="text-xs font-bold">{t("Download and install now")}</Label>
                <p className="text-[11px] text-muted-foreground">{t("Download client jar, libraries, and assets immediately")}</p>
              </div>
              <Switch id="install-now-toggle" checked={installNow} onCheckedChange={setInstallNow} />
            </div>

            <DialogFooter className="pt-1">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>{t("Cancel")}</Button>
              <PlayBlock size="md" icon={Download} busy={busy} disabled={busy || !version} onClick={create}>
                {installNow ? t("Install") : t("Create")}
              </PlayBlock>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("New instance")}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>{t("Loader")}</Label>
          <LoaderPicker loader={loader} onChange={setLoader} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="instance-name">{t("Name")}</Label>
          <Input
            id="instance-name"
            value={name}
            placeholder={placeholder}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !busy) create(); }}
          />
        </div>
        {loader !== "daisy" ? (
          <div className="space-y-2">
            <Label>{t("Minecraft version")}</Label>
            <PlainVersionSelect loader={loader} list={plain.list} error={plain.error} value={version} onChange={setVersion} />
          </div>
        ) : (
        <div className="space-y-2">
          <Label>{t("Minecraft version")}</Label>
          {/*
            A grid rather than one flex row. The row was sized for five versions and
            could not shrink below the widest chip, so adding 26.1.2 and 26.2 pushed
            the name field and the whole strip out past the edge of the dialog.
          */}
          <div className="grid grid-cols-3 gap-1.5">
            {available.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVersion(v.id)}
                className={cn(
                  "min-w-0 rounded-md border px-2 py-2 text-sm font-medium transition-colors",
                  version === v.id
                    ? "border-primary/50 bg-accent text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-accent/40"
                )}
              >
                <span className="flex items-center justify-center gap-1.5 truncate">
                  {v.id}
                  {/*
                    Every version other than the primary one read "Supported", so the
                    badge said nothing and was the widest thing in each chip. Kept for
                    a status that actually distinguishes a version.
                  */}
                  {v.status && v.status !== "Primary" && v.status !== "Supported" ? (
                    <Badge variant="secondary" className="text-[10px]">{t(v.status)}</Badge>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        </div>
        )}
        <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
          <Label htmlFor="install-now-plain" className="text-xs font-medium">{t("Download and install now")}</Label>
          <Switch id="install-now-plain" checked={installNow} onCheckedChange={setInstallNow} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>{t("Cancel")}</Button>
          <Button onClick={create} disabled={busy || !version}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {installNow ? t("Install") : t("Create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * updateInstance already existed in main - there was just nowhere in the UI to reach it,
 * so an instance kept whatever name it was created with forever.
 */
export function RenameInstanceDialog({ instance, onOpenChange, onRenamed, notify }) {
  const t = useT();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setName(instance?.name || ""); }, [instance]);

  const open = Boolean(instance);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === instance.name) { onOpenChange(false); return; }
    setBusy(true);
    try {
      const res = await api()?.updateInstance({ id: instance.id, name: trimmed });
      if (res && res.ok === false) notify?.(res.message || t("Could not rename the instance."), "error");
      onOpenChange(false);
      onRenamed?.();
    } catch (e) {
      notify?.(String(e?.message || e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("Rename instance")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="rename-instance">{t("Name")}</Label>
          <Input
            id="rename-instance"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !busy) save(); }}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>{t("Cancel")}</Button>
          <Button onClick={save} disabled={busy || !name.trim()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InstanceRow({ instance, selected, onSelect, onAction, busyId, onOpen }) {
  const t = useT();
  const busy = busyId === instance.id;
  return (
    <div
      className={cn(
        "lift group flex items-center gap-3 rounded-md border px-3 py-2.5",
        selected ? "border-primary/50 bg-accent/50" : "border-border bg-card hover:bg-accent/40"
      )}
    >
      <button
        onClick={() => onOpen(instance)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        aria-label={t("Open {name}", { name: instance.name })}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent">
          {selected ? <Check className="size-4 text-primary" /> : <Boxes className="size-4 text-muted-foreground" />}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{instance.name}</span>
            {selected ? <Badge variant="success">{t("Selected")}</Badge> : null}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{[instance.loader, instance.version].filter(Boolean).join(" ") || t("unknown version")}</span>
            {/* Only ever set explicitly on import - existing Daisy instances leave it
                undefined, so they are not mislabelled as unsupported. */}
            {instance.daisySupported === false ? (
              <span className="flex items-center gap-1 text-warning">
                <TriangleAlert className="size-3" />
                {t("Daisy not available in game")}
              </span>
            ) : null}
          </div>
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        {busy ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
        {!selected ? (
          <Button variant="ghost" size="sm" title={t("Use this instance")} onClick={() => onSelect(instance)}>
            {t("Select")}
          </Button>
        ) : null}
        <Button variant="ghost" size="icon" title={t("Add content")} onClick={() => onAction("content", instance)}>
          <Blocks className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon" title={t("Open folder")} onClick={() => onAction("open", instance)}>
          <Folder className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon" title={t("Rename")} onClick={() => onAction("rename", instance)}>
          <Pencil className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon" title={t("Duplicate")} onClick={() => onAction("duplicate", instance)}>
          <Copy className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon" title={t("Export as .rvr")} onClick={() => onAction("export", instance)}>
          <Upload className="size-3.5" />
        </Button>
        {instance.loader === "fabric" || !instance.loader ? (
          <Button variant="ghost" size="icon" title={t("Performance mods")} onClick={() => onAction("performance", instance)}>
            <Gauge className="size-3.5" />
          </Button>
        ) : null}
        <Button variant="ghost" size="icon" title={t("Repair")} onClick={() => onAction("repair", instance)}>
          <Wrench className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon" title={t("Delete")} onClick={() => onAction("delete", instance)}>
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

/** Everything the Classic row shows on hover, as one menu on a Modern card. */
function InstanceMenu({ instance, selected, onSelect, onAction }) {
  const t = useT();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label={t("More actions for {name}", { name: instance.name })}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!selected ? (
          <DropdownMenuItem onSelect={() => onSelect(instance)}><MousePointerClick />{t("Use this instance")}</DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={() => onAction("content", instance)}><Blocks />{t("Add content")}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction("open", instance)}><Folder />{t("Open folder")}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction("rename", instance)}><Pencil />{t("Rename")}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction("duplicate", instance)}><Copy />{t("Duplicate")}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction("export", instance)}><Upload />{t("Export as .rvr")}</DropdownMenuItem>
        {instance.loader === "fabric" || !instance.loader ? (
          <DropdownMenuItem onSelect={() => onAction("performance", instance)}><Gauge />{t("Performance mods")}</DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={() => onAction("repair", instance)}><Wrench />{t("Repair")}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => onAction("delete", instance)}><Trash2 />{t("Delete")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Shown after Repair finishes. Splits what happened into three clear buckets: what got
 * updated, what genuinely needs the user's attention (hard incompatibilities), and
 * soft-conflict notes that are advisory only - the last section is deliberately worded
 * so it never reads as "these two mods can't work together" for mods that actually can.
 */
export function InstancesView({ status, refresh, notify, openInstance }) {
  const t = useT();
  const modern = useModern();
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [contentFor, setContentFor] = useState(null);
  const [busyId, setBusyId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [repairResult, setRepairResult] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [packBusy, setPackBusy] = useState(false);

  // A Modrinth .mrpack or CurseForge .zip becomes its own instance on the pack's loader.
  const importPack = async () => {
    setPackBusy(true);
    try {
      const res = await api()?.importModpackFile();
      if (!res || res.cancelled) return;
      if (res.ok === false) notify(res.message || t("Import failed."), "error");
      else notify(res.warning ? `${res.message} ${res.warning}` : res.message, res.warning ? "error" : "info");
      await refresh();
    } catch (e) {
      notify(String(e?.message || e), "error");
    } finally {
      setPackBusy(false);
    }
  };

  const instances = Array.isArray(status?.instances) ? status.instances : [];
  const selectedId = status?.selectedInstance?.id;
  // Pictures and mod counts are only drawn by the Modern cards, so Classic skips the fetch.
  const cards = useInstanceCards(instances, modern);
  const gameBusy = Boolean(status?.running) || status?.launchState === "launching";

  // Play straight from a card: the backend launches the selected instance, so select first.
  const play = async (instance) => {
    setBusyId(instance.id);
    try {
      if (instance.id !== selectedId) { await api()?.selectInstance(instance.id); await refresh(); }
      const res = await api()?.launchClient({});
      if (res && res.ok === false) notify(res.message || t("Launch failed."), "error");
    } catch (e) {
      notify(String(e?.message || e), "error");
    } finally {
      setBusyId("");
    }
  };

  const select = async (instance) => {
    setBusyId(instance.id);
    try { await api()?.selectInstance(instance.id); await refresh(); } finally { setBusyId(""); }
  };

  // Adding content targets the selected instance, so select it first if needed.
  const openContent = async (instance) => {
    if (instance.id !== selectedId) {
      setBusyId(instance.id);
      try { await api()?.selectInstance(instance.id); await refresh(); } finally { setBusyId(""); }
    }
    setContentFor(instance);
  };

  const run = async (action, instance) => {
    if (action === "delete") { setConfirmDelete(instance); return; }
    if (action === "rename") { setRenaming(instance); return; }
    if (action === "content") { openContent(instance); return; }
    setBusyId(instance.id);
    try {
      const bridge = api();
      if (action === "open") await bridge?.openPath(instance.path);
      if (action === "duplicate") await bridge?.duplicateInstance({ instanceId: instance.id });
      if (action === "export") {
        const res = await bridge?.exportInstance(instance.id);
        if (res?.ok === false) {
          // A cancelled save dialog is a normal outcome, not an error to shout about.
          if (res.message && res.message !== "Cancelled.") notify(res.message, "error");
        } else {
          notify(res?.message || t("Exported instance."), "info");
        }
      }
      if (action === "performance") {
        const res = await bridge?.installPerformanceMods({ instanceId: instance.id });
        notify(res?.message || t("Performance mods installed."), res?.ok === false ? "error" : "info");
      }
      if (action === "repair") {
        const res = await bridge?.repairInstance({ instanceId: instance.id });
        if (res?.ok === false) {
          notify(res.message || t("Repair failed."), "error");
        } else {
          setRepairResult({ name: res?.instanceName || instance.name, ...res });
        }
      }
      await refresh();
    } catch (e) {
      notify(String(e?.message || e), "error");
    } finally {
      setBusyId("");
    }
  };

  const doDelete = async () => {
    const instance = confirmDelete;
    if (!instance) return;
    setBusyId(instance.id);
    setConfirmDelete(null);
    try {
      // The dialog promises the folder goes too, so ask the backend to delete it.
      const res = await api()?.deleteInstance({ instanceId: instance.id, deleteFiles: true });
      if (res && res.ok === false) notify(res.message || t("Could not delete the instance."), "error");
      else notify(res?.message || t("Instance deleted."), "info");
      await refresh();
    } catch (e) {
      notify(String(e?.message || e), "error");
    } finally {
      setBusyId("");
    }
  };

  return (
    <Page
      title={t("Instances")}
      description={t("Separate mods, worlds and settings per instance.")}
      actions={
        <>
          <Button size="sm" variant="outline" onClick={() => setImporting(true)}>
            <Download className="size-3.5" />
            {t("Import")}
          </Button>
          <Button size="sm" variant="outline" onClick={importPack} disabled={packBusy}>
            {packBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Package className="size-3.5" />}
            {t("Modpack")}
          </Button>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" />
            {t("New")}
          </Button>
        </>
      }
    >
      {instances.length && modern ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {instances.map((instance) => (
            <ModernInstanceCard
              key={instance.id}
              instance={instance}
              card={cards[instance.id]}
              selected={instance.id === selectedId}
              busy={busyId === instance.id}
              disabled={gameBusy || Boolean(busyId)}
              onOpen={() => openInstance?.(instance.id)}
              onPlay={() => play(instance)}
              actions={<InstanceMenu instance={instance} selected={instance.id === selectedId} onSelect={select} onAction={run} />}
            />
          ))}
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex min-h-52 flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-border/80 bg-card/60 text-muted-foreground transition-all hover:border-primary hover:bg-primary/5 hover:text-primary hover:shadow-[3px_3px_0px_#080808]"
          >
            <div className="flex size-12 items-center justify-center rounded-xl border-2 border-daisy-ink bg-primary text-primary-foreground shadow-[2px_2px_0px_#080808]">
              <Plus className="size-6 stroke-[3]" />
            </div>
            <span className="text-sm font-black uppercase tracking-wider">{t("New instance")}</span>
          </button>
        </div>
      ) : instances.length ? (
        <div className="space-y-2">
          {instances.map((instance) => (
            <InstanceRow
              key={instance.id}
              instance={instance}
              selected={instance.id === selectedId}
              onSelect={select}
              onOpen={(item) => openInstance?.(item.id)}
              onAction={run}
              busyId={busyId}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Boxes}
          title={t("No instances")}
          description={t("Make one to get started.")}
          action={<Button size="sm" onClick={() => setCreating(true)}><Plus className="size-3.5" />{t("New instance")}</Button>}
        />
      )}

      <CreateInstanceDialog open={creating} onOpenChange={setCreating} onCreated={refresh} notify={notify} versions={status?.versions} />

      <ImportInstancesDialog open={importing} onOpenChange={setImporting} refresh={refresh} notify={notify} targetVersion={status?.selectedVersion || "1.21.11"} availableVersions={status?.versions?.map((version) => version.id) || []} />

      <RepairResultDialog result={repairResult} onOpenChange={(v) => !v && setRepairResult(null)} />

      <RenameInstanceDialog
        instance={renaming}
        onOpenChange={(v) => !v && setRenaming(null)}
        onRenamed={refresh}
        notify={notify}
      />

      <ContentDialog
        open={Boolean(contentFor)}
        onOpenChange={(v) => !v && setContentFor(null)}
        title={t("Add content to {name}", { name: contentFor?.name })}
        description={t("Browse Modrinth and CurseForge for mods, resource packs and shaders.")}
        status={status}
        refresh={refresh}
        notify={notify}
      />

      <Dialog open={Boolean(confirmDelete)} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("Delete {name}?", { name: confirmDelete?.name })}</DialogTitle>
            <DialogDescription>
              {t("This permanently removes the instance folder, including its worlds and mods. It cannot be undone.")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>{t("Cancel")}</Button>
            <Button variant="destructive" onClick={doDelete}>{t("Delete")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
