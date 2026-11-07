import React, { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, ExternalLink, FolderInput, Package, Server, Shirt, Square, Users, Play, Plus, Compass, Sparkles, X, Settings2 } from "lucide-react";
import { api, useLatestLog } from "../lib/useStatus";
import { cn, formatLastPlayed } from "../lib/utils";
import { PlayerHead, resolveSkinTexture } from "../components/player-head";
import { SkinViewer } from "../components/skin-viewer";
import { CrashReport } from "../components/crash-report";
import { ModCompatibility } from "../components/mod-compatibility";
import { ImportInstancesDialog } from "../components/import-instances";
import { ContentDialog } from "../components/content-browser";
import { InstanceArt, PlayBlock, useInstanceCards } from "../components/instance-art";
import { ModernInstanceCard, instanceVersionLabel } from "../components/instance-card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { PlaytimeStat, ServerAddress, SignInCard, useLauncherActions, useServerList } from "./home";
import { Bats, CornerWeb, Mist, NightSky, Pumpkin } from "../components/modern-season";
import { useSeasonId } from "../lib/seasons";
import { useT } from "../i18n/context.jsx";

/**
 * Modern Warm Bento Home:
 * 12-column grid with chunky rounded tiles (24px radius), soft borders, warm near-black background,
 * daisy yellow (#FFD60A) & cream (#FFF6D6) highlights.
 */
export function ModernHomeView({ status, refresh, notify, launch: launchProp, stop: stopProp, busy: busyProp, go, openInstance }) {
  const t = useT();
  const { busy: actionBusy, launch: actionLaunch, stop: actionStop } = useLauncherActions(notify);
  const launch = launchProp || actionLaunch;
  const stop = stopProp || actionStop;
  const busy = busyProp || actionBusy;
  const profile = status?.auth?.profile;
  const selected = status?.selectedInstance;
  const instances = Array.isArray(status?.instances) ? status.instances : [];
  const cards = useInstanceCards(instances);
  const card = cards[selected?.id];
  const running = Boolean(status?.running);
  const launching = status?.launchState === "launching";
  const disabled = busy || launching || running;
  const log = useLatestLog();

  const [switching, setSwitching] = useState(false);
  const [contentOpen, setContentOpen] = useState(false);
  const [showOffline, setShowOffline] = useState(false);
  const [dismissMigration, setDismissMigration] = useState(false);

  const { servers, reachableServers, offlineServers } = useServerList();

  const pick = async (id) => {
    if (!id || id === selected?.id) return;
    try { await api()?.selectInstance(id); await refresh(); }
    catch (e) { notify(String(e?.message || e), "error"); }
  };

  const playInstance = async (inst) => {
    if (inst.id !== selected?.id) await pick(inst.id);
    await launch("");
  };

  // Recent instances for quick launch column (excluding currently selected)
  const quickInstances = useMemo(() => {
    return instances
      .filter((i) => i.id !== selected?.id)
      .sort((a, b) => (Number(b.lastPlayedAt) || 0) - (Number(a.lastPlayedAt) || 0))
      .slice(0, 3);
  }, [instances, selected?.id]);

  const modCount = cards[selected?.id]?.modCount ?? (Array.isArray(status?.installedMods) ? status.installedMods.length : 0);
  const skins = Array.isArray(status?.skinHistory) ? status.skinHistory : [];
  const activeSkin = skins.find((skin) => skin.active) || skins[0];
  const capes = Array.isArray(profile?.capes) ? profile.capes : [];
  const cape = capes.find((entry) => entry.active || entry.state === "ACTIVE");
  const skin = profile ? resolveSkinTexture(status) : "";
  const lastPlayed = formatLastPlayed(selected?.lastPlayedAt);

  // Featured mods for rich cards
  const modItems = useMemo(() => {
    const list = [];
    const seen = new Set();
    for (const entry of Array.isArray(status?.installedMods) ? status.installedMods : []) {
      const url = entry?.metadata?.iconUrl || entry?.metadata?.remoteIconUrl;
      const title = entry?.metadata?.name || entry?.metadata?.title || entry?.name || entry?.file?.replace(/\.jar(\.disabled)?$/i, "") || "Mod";
      const desc = entry?.metadata?.description || entry?.metadata?.summary || "";
      const version = entry?.metadata?.version || "";
      if (title && !seen.has(title)) {
        seen.add(title);
        list.push({ url, title, desc, version, disabled: entry?.disabled });
      }
      if (list.length >= 4) break;
    }
    return list;
  }, [status?.installedMods]);

  const halloween = useSeasonId() === "halloween";

  return (
    <div className="flex h-full min-h-0 bg-[#0f0e0c] text-[#fffdf2]">
      <div className="min-w-0 flex-1 overflow-y-auto px-8 pb-10">
        
        {/* Top bar: friendly 20px greeting */}
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">👋</span>
            <span className="text-[20px] font-medium text-[#b8b2a3]">
              {profile ? (
                <>
                  {t("Welcome back,")}{" "}
                  <span className="font-bold text-[#fffdf2]">{profile.name}</span>
                </>
              ) : (
                t("Welcome to Daisy")
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#17150f] px-3 py-1 text-xs font-semibold text-[#ffd60a]">
              <span className="size-2 rounded-full bg-[#ffd60a] animate-pulse" />
              Daisy Client
            </span>
          </div>
        </header>

        {/* System notices if any */}
        <div className="space-y-4 mb-6">
          <ModCompatibility status={status} refresh={refresh} notify={notify} />
          <CrashReport status={status} refresh={refresh} notify={notify} />
          {!profile && <SignInCard notify={notify} />}
        </div>

        {/* 12-Column Bento Grid */}
        <div className="grid grid-cols-12 gap-6">

          {/* 1. Hero Tile (8 cols, ~380px tall) */}
          <section className="relative col-span-12 xl:col-span-8 flex flex-col justify-between overflow-hidden rounded-[24px] border border-white/[0.12] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all hover:border-white/[0.2] min-h-[380px]">
            {/* Rich Minecraft Landscape Backdrop in Hero Bento Tile with positive z-index 0 underneath z-10 content */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
              <div className="absolute inset-0 scale-105">
                <img
                  src="../assets/home-hero-custom.jpg"
                  alt=""
                  className="size-full object-cover hero-drift"
                />
              </div>
              {/* Refined gradient overlay: keeps the gorgeous river, mountain, and cherry trees visible while making text sharp */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30" />
              {/* Soft yellow spotlight behind 3D skin */}
              <div className="absolute right-12 top-1/2 size-72 -translate-y-1/2 rounded-full bg-[#ffd60a]/15 blur-3xl pointer-events-none" />
            </div>

            {/* Top info kicker */}
            <div className="relative z-10 flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#ffd60a]">
                {running ? t("In game") : launching ? t("Starting...") : t("Ready to play")}
              </span>
            </div>

            {/* Left Content */}
            <div className="relative z-10 max-w-lg my-auto pt-4">
              <h1 className="font-display text-[46px] font-bold leading-tight tracking-[-0.03em] text-[#fffdf2]">
                {selected?.name || "Daisy 1.21.11"}
              </h1>

              {/* Version & Metadata Chips */}
              <div className="mt-3.5 flex flex-wrap items-center gap-2 text-[13px]">
                <span className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-medium text-[#fffdf2]">
                  {instanceVersionLabel(selected) || "Fabric 1.21.11"}
                </span>
                <span className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-medium text-[#b8b2a3]">
                  {t("{count} mods", { count: modCount || 0 })}
                </span>
                <span className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-medium text-[#b8b2a3]">
                  <PlaytimeStat settings={status?.settings} notify={notify} />
                </span>
                {lastPlayed && (
                  <span className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-medium text-[#b8b2a3]">
                    {lastPlayed}
                  </span>
                )}
              </div>

              {/* Play & Settings Actions */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                {running ? (
                  <PlayBlock
                    size="lg"
                    danger
                    busy={busy}
                    onClick={stop}
                  >
                    {t("Stop")}
                  </PlayBlock>
                ) : (
                  <PlayBlock
                    size="lg"
                    busy={launching || busy}
                    disabled={disabled}
                    onClick={() => launch("")}
                  >
                    {launching || busy ? t("Launching") : t("Play")}
                  </PlayBlock>
                )}

                <button
                  type="button"
                  onClick={() => openInstance?.(selected?.id)}
                  className="flex h-14 items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.05] px-5 text-sm font-semibold text-[#fffdf2] shadow-sm backdrop-blur-sm transition-all hover:border-[#ffd60a]/40 hover:bg-white/[0.1] active:scale-[0.98]"
                >
                  <Settings2 className="size-4 text-[#ffd60a]" />
                  <span>{t("Instance settings")}</span>
                </button>
              </div>

              {launching && log && (
                <p className="mt-3 truncate text-xs text-[#b8b2a3]">{log}</p>
              )}
            </div>

            {/* Right: 3D Player Skin Showcase */}
            {skin ? (
              <div className="absolute right-6 bottom-0 top-6 hidden w-[270px] xl:block pointer-events-auto">
                <div className="relative size-full">
                  <SkinViewer
                    texture={skin}
                    slim={activeSkin?.variant === "slim"}
                    cape={cape?.url || ""}
                    spin={false}
                    idle
                    scale={8}
                    className="absolute inset-0"
                  />
                </div>
              </div>
            ) : null}
          </section>

          {/* 2. Quick Launch / Instances Column (4 cols) */}
          <section className="col-span-12 xl:col-span-4 flex flex-col justify-between rounded-[24px] border border-white/[0.08] bg-[#17150f] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between pb-3">
              <h2 className="font-display text-lg font-bold text-[#fffdf2]">{t("Quick launch")}</h2>
              <button
                type="button"
                onClick={() => go("instances")}
                className="flex items-center gap-1 text-xs font-semibold text-[#ffd60a] hover:underline"
              >
                {t("See all")}
                <ArrowRight className="size-3" />
              </button>
            </div>

            <div className="flex-1 space-y-2.5 my-2">
              {quickInstances.length > 0 ? (
                quickInstances.map((inst) => (
                  <div
                    key={inst.id}
                    className="group flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 transition-all hover:border-[#ffd60a]/40 hover:bg-white/[0.05]"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="truncate text-sm font-bold text-[#fffdf2]">{inst.name}</div>
                      <div className="truncate text-xs text-[#b8b2a3]">
                        {instanceVersionLabel(inst) || "Fabric"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => playInstance(inst)}
                      disabled={disabled}
                      className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-[#fffdf2] transition-colors hover:bg-[#ffd60a] hover:text-[#0f0e0c]"
                      title={t("Play")}
                    >
                      <Play className="size-4 fill-current ml-0.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="flex h-36 flex-col items-center justify-center text-center text-xs text-[#b8b2a3]">
                  <span>{t("No other instances yet.")}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => go("instances")}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.12] py-2.5 text-xs font-semibold text-[#b8b2a3] transition-colors hover:border-[#ffd60a] hover:text-[#ffd60a]"
            >
              <Plus className="size-4" />
              <span>{t("Create new instance")}</span>
            </button>
          </section>

          {/* 3. Mods Bento Tile (4 cols) */}
          <section className="col-span-12 md:col-span-6 xl:col-span-4 flex flex-col justify-between rounded-[24px] border border-white/[0.08] bg-[#17150f] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all hover:border-white/[0.16] hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl border border-white/[0.1] bg-[#ffd60a]/10 text-[#ffd60a]">
                  <Package className="size-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold leading-tight text-[#fffdf2]">{t("Mods")}</h2>
                  <p className="text-xs font-medium text-[#b8b2a3]">{t("{count} installed", { count: modCount })}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setContentOpen(true)}
                className="group flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs font-semibold text-[#ffd60a] transition-all hover:border-[#ffd60a]/40 hover:bg-[#ffd60a]/10"
              >
                <span>{t("Manage")}</span>
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>

            {/* Rich Mod Cards List */}
            <div className="my-4 space-y-2">
              {modItems.length > 0 ? (
                modItems.map((mod, i) => (
                  <div
                    key={i}
                    onClick={() => setContentOpen(true)}
                    className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-2.5 transition-all hover:border-[#ffd60a]/30 hover:bg-white/[0.06]"
                  >
                    <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-[#12110c] shadow-inner">
                      {mod.url ? (
                        <img src={mod.url} alt="" className="size-full object-contain p-1.5 transition-transform group-hover:scale-110" />
                      ) : (
                        <Package className="size-5 text-[#b8b2a3]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-xs font-bold text-[#fffdf2] group-hover:text-[#ffd60a] transition-colors">
                          {mod.title}
                        </span>
                        {mod.version ? (
                          <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-mono text-[#b8b2a3]">
                            {mod.version}
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-[11px] text-[#b8b2a3]/80">
                        {mod.desc || t("Fabric mod")}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-36 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.08] p-4 text-center text-xs text-[#b8b2a3]">
                  <Package className="size-6 opacity-40" />
                  <span>{t("No mods installed yet.")}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setContentOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 text-xs font-semibold text-[#fffdf2] shadow-sm transition-all hover:border-[#ffd60a]/40 hover:bg-[#ffd60a]/10 hover:text-[#ffd60a] active:scale-[0.98]"
            >
              <Plus className="size-3.5" />
              <span>{t("Browse more mods")}</span>
            </button>
          </section>

          {/* 4. Wardrobe Bento Tile (4 cols) */}
          <section className="col-span-12 md:col-span-6 xl:col-span-4 flex flex-col justify-between rounded-[24px] border border-white/[0.08] bg-[#17150f] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all hover:border-white/[0.14]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-[#fffdf2]">{t("Wardrobe")}</h2>
                <p className="text-xs text-[#b8b2a3]">
                  {profile ? t("{count} saved", { count: skins.length }) : t("Custom skin")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => go("wardrobe")}
                className="text-xs font-semibold text-[#ffd60a] hover:underline"
              >
                {t("Open wardrobe →")}
              </button>
            </div>

            <div className="my-4 flex items-center justify-center py-2">
              {profile ? (
                <div className="relative rounded-2xl border border-white/[0.1] bg-white/[0.03] p-3 shadow-inner">
                  <PlayerHead
                    skinUrl={resolveSkinTexture(status)}
                    name={profile.name}
                    size={84}
                    className="rounded-xl shadow-lg"
                  />
                  <span className="absolute -bottom-1 -right-1 rounded-md bg-[#ffd60a] px-1.5 py-0.5 text-[9px] font-bold text-[#0f0e0c]">
                    Active
                  </span>
                </div>
              ) : (
                <Shirt className="size-16 text-[#b8b2a3]/40" />
              )}
            </div>

            <button
              type="button"
              onClick={() => go("wardrobe")}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/[0.04] py-2.5 text-xs font-semibold text-[#fffdf2] transition-colors hover:bg-white/[0.08]"
            >
              <Plus className="size-3.5" />
              <span>{t("Add skin")}</span>
            </button>
          </section>

          {/* 5. Servers Bento Tile (4 cols) */}
          <section className="col-span-12 md:col-span-12 xl:col-span-4 flex flex-col justify-between rounded-[24px] border border-white/[0.08] bg-[#17150f] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all hover:border-white/[0.14]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-[#fffdf2]">{t("Servers")}</h2>
                <p className="text-xs text-[#b8b2a3]">{t("Multiplayer servers")}</p>
              </div>
            </div>

            <div className="my-4 flex-1">
              {servers.length > 0 ? (
                <div className="space-y-2">
                  {reachableServers.slice(0, 2).map((srv) => (
                    <div
                      key={srv.name}
                      className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="truncate text-xs font-bold text-[#fffdf2]">{srv.name}</div>
                        <div className="truncate text-[11px] text-[#b8b2a3]">
                          {srv.players ? `${srv.players.online}/${srv.players.max} online` : "Online"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => launch(srv.ip)}
                        disabled={disabled}
                        className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-[#ffd60a] hover:bg-[#ffd60a] hover:text-[#0f0e0c]"
                      >
                        {t("Join")}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <Server className="size-8 text-[#b8b2a3]/40 mb-1" />
                  <span className="text-sm font-semibold text-[#fffdf2]">{t("No servers yet")}</span>
                  <p className="text-xs text-[#b8b2a3] mt-0.5">{t("Servers you join show up here.")}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => notify(t("Use In-Game Multiplayer to add servers."), "info")}
                className="flex-1 rounded-xl bg-white/[0.04] py-2 text-xs font-semibold text-[#fffdf2] hover:bg-white/[0.08]"
              >
                {t("Add server")}
              </button>
              <button
                type="button"
                onClick={() => notify(t("Browse popular servers in community hub."), "info")}
                className="flex-1 rounded-xl bg-white/[0.04] py-2 text-xs font-semibold text-[#ffd60a] hover:bg-white/[0.08]"
              >
                {t("Browse popular")}
              </button>
            </div>
          </section>

          {/* 6. Slim Dismissible Migration Banner */}
          {!dismissMigration && (
            <section className="col-span-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-gradient-to-r from-[#17150f] to-[#1e1c15] px-6 py-4 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#ffd60a]/15 text-[#ffd60a]">
                  <FolderInput className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#fffdf2]">{t("Coming from another launcher?")}</h3>
                  <p className="text-xs text-[#b8b2a3]">
                    {t("Bring your worlds, packs and servers into Daisy. Your old profile stays untouched.")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSwitching(true)}
                  className="rounded-xl border-[#ffd60a]/50 text-[#ffd60a] hover:bg-[#ffd60a]/10"
                >
                  {t("Switch to Daisy")}
                </Button>
                <button
                  type="button"
                  onClick={() => setDismissMigration(true)}
                  className="text-[#b8b2a3] hover:text-[#fffdf2] p-1"
                  title="Dismiss"
                >
                  <X className="size-4" />
                </button>
              </div>
            </section>
          )}

        </div>
      </div>

      <ImportInstancesDialog
        open={switching}
        onOpenChange={setSwitching}
        refresh={refresh}
        notify={notify}
        targetVersion={status?.selectedVersion || "1.21.11"}
        availableVersions={status?.versions?.map((version) => version.id) || []}
      />

      <ContentDialog
        open={contentOpen}
        onOpenChange={setContentOpen}
        title={t("Add content to {name}", { name: selected?.name || "Daisy Default" })}
        description={t("Browse Modrinth and CurseForge for mods, resource packs and shaders.")}
        status={status}
        refresh={refresh}
        notify={notify}
      />
    </div>
  );
}
