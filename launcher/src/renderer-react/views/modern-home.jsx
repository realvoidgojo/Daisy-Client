import React, { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, ExternalLink, FolderInput, Package, Server, Shirt, Square, Users, Play, Plus, Compass, Sparkles, X, Settings2 } from "lucide-react";
import { api, useLatestLog } from "../lib/useStatus";
import { cn, formatLastPlayed } from "../lib/utils";
import { PlayerHead, resolveSkinTexture } from "../components/player-head";
import { SkinViewer } from "../components/skin-viewer";
import { SkinFront } from "../components/skin-art";
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
  const [contentMode, setContentMode] = useState("browse");
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
    <div className="flex h-full min-h-0 bg-[#0d0e13] text-[#f4f5f8]">
      <div className="min-w-0 flex-1 overflow-y-auto px-8 pb-10">
        
        {/* Top bar: friendly 20px greeting */}
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">👋</span>
            <span className="text-[20px] font-medium text-[#9aa1b2]">
              {profile ? (
                <>
                  {t("Welcome back,")}{" "}
                  <span className="font-bold text-[#f4f5f8]">{profile.name}</span>
                </>
              ) : (
                t("Welcome to Daisy")
              )}
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
          <section className="relative col-span-12 xl:col-span-8 flex flex-col justify-between overflow-hidden rounded-2xl border-2 border-black bg-[#151720] p-8 shadow-[6px_6px_0px_#000000] min-h-[380px]">
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
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#ffd60a] bg-black/80 px-2.5 py-1 rounded border border-[#ffd60a]/40 shadow-[2px_2px_0px_#000000]">
                {running ? t("In game") : launching ? t("Starting...") : t("Ready to play")}
              </span>
            </div>

            {/* Left Content */}
            <div className="relative z-10 max-w-lg my-auto pt-2">
              <h1 className="font-pixel text-2xl md:text-3xl font-normal leading-tight tracking-wide text-[#f4f5f8] drop-shadow-[2px_2px_0px_#000000]">
                {selected?.name || "Daisy 1.21.11"}
              </h1>

              {/* Version & Metadata Chips */}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded border-2 border-black bg-[#ffd60a] px-2.5 py-1 font-bold text-[#0f0e0c] shadow-[2px_2px_0px_#000000]">
                  {instanceVersionLabel(selected) || "Fabric 1.21.11"}
                </span>
                <span className="rounded border-2 border-black bg-[#151720] px-2.5 py-1 font-semibold text-[#f4f5f8] shadow-[2px_2px_0px_#000000]">
                  {t("{count} mods", { count: modCount || 0 })}
                </span>
                <span className="rounded border-2 border-black bg-[#151720] px-2.5 py-1 font-semibold text-[#9aa1b2] shadow-[2px_2px_0px_#000000]">
                  <PlaytimeStat settings={status?.settings} notify={notify} />
                </span>
                {lastPlayed && (
                  <span className="rounded border-2 border-black bg-[#151720] px-2.5 py-1 font-semibold text-[#9aa1b2] shadow-[2px_2px_0px_#000000]">
                    {lastPlayed}
                  </span>
                )}
              </div>

              {/* Play & Settings Actions */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
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

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openInstance?.(selected?.id)}
                  className="h-11"
                >
                  <Settings2 className="size-4 text-[#ffd60a]" />
                  <span>{t("Instance settings")}</span>
                </Button>
              </div>

              {launching && log && (
                <p className="mt-3 truncate text-xs text-[#9aa1b2]">{log}</p>
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
          <section className="relative col-span-12 xl:col-span-4 flex flex-col overflow-hidden rounded-2xl border-2 border-black bg-[#151720]/80 backdrop-blur-md p-5 shadow-[4px_4px_0px_#000000]">
            {/* Minecraft Background with overlay */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
              <img
                src="../assets/home-bg-1.jpg"
                alt=""
                className="size-full object-cover opacity-20 scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#151720] via-[#151720]/85 to-[#151720]/60" />
            </div>

            <div className="relative z-10 flex items-center justify-between pb-2 border-b border-black/40">
              <h2 className="text-sm font-bold text-[#f4f5f8] uppercase tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{t("Quick launch")}</h2>
              <button
                type="button"
                onClick={() => go("instances")}
                className="flex items-center gap-1 text-xs font-semibold text-[#ffd60a] hover:underline"
              >
                {t("See all")}
                <ArrowRight className="size-3" />
              </button>
            </div>

            <div className="relative z-10 flex-1 space-y-2 my-3">
              {quickInstances.length > 0 ? (
                quickInstances.map((inst) => (
                  <div
                    key={inst.id}
                    className="group flex items-center justify-between rounded-xl border-2 border-black bg-[#1a1c27]/90 backdrop-blur-sm p-2.5 shadow-[2px_2px_0px_#000000] transition-all hover:border-[#ffd60a]"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="truncate text-xs font-bold text-[#f4f5f8]">{inst.name}</div>
                      <div className="truncate text-[11px] text-[#9aa1b2]">
                        {instanceVersionLabel(inst) || "Fabric"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => playInstance(inst)}
                      disabled={disabled}
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg border-2 border-black bg-[#ffd60a] text-[#0f0e0c] shadow-[1px_1px_0px_#000000] transition-all hover:translate-x-0.5 hover:translate-y-0.5"
                      title={t("Play")}
                    >
                      <Play className="size-3.5 fill-current ml-0.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="flex h-36 flex-col items-center justify-center text-center text-xs text-[#9aa1b2]">
                  <span>{t("No other instances yet.")}</span>
                </div>
              )}
            </div>

            <div className="relative z-10 mt-auto pt-2 border-t border-black/40 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => go("instances")}
              >
                <Plus className="size-3.5 text-[#ffd60a]" />
                <span>{t("Create new instance")}</span>
              </Button>
            </div>
          </section>

          {/* 3. Mods Bento Tile (4 cols) */}
          <section className="relative col-span-12 md:col-span-6 xl:col-span-4 flex flex-col overflow-hidden rounded-2xl border-2 border-black bg-[#151720]/80 backdrop-blur-md p-5 shadow-[4px_4px_0px_#000000]">
            {/* Minecraft Background with overlay */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
              <img
                src="../assets/backdrop.jpg"
                alt=""
                className="size-full object-cover opacity-20 scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#151720] via-[#151720]/85 to-[#151720]/60" />
            </div>

            <div className="relative z-10 flex items-center justify-between pb-2 border-b border-black/40">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg border-2 border-black bg-[#ffd60a] text-[#0f0e0c] shadow-[1px_1px_0px_#000000]">
                  <Package className="size-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold leading-tight text-[#f4f5f8] uppercase tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{t("Mods")}</h2>
                  <p className="text-[11px] text-[#9aa1b2]">{t("{count} installed", { count: modCount })}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setContentMode("installed"); setContentOpen(true); }}
                className="group flex items-center gap-1 rounded-lg border-2 border-black bg-[#1a1c27]/90 px-2.5 py-1 text-xs font-semibold text-[#ffd60a] shadow-[1px_1px_0px_#000000] transition-all hover:bg-[#ffd60a] hover:text-[#0f0e0c]"
              >
                <span>{t("Manage")}</span>
                <ArrowRight className="size-3" />
              </button>
            </div>

            {/* Rich Mod Cards List */}
            <div className="relative z-10 my-3 space-y-2 flex-1">
              {modItems.length > 0 ? (
                modItems.map((mod, i) => (
                  <div
                    key={i}
                    onClick={() => { setContentMode("installed"); setContentOpen(true); }}
                    className="group flex cursor-pointer items-center gap-2.5 rounded-xl border-2 border-black bg-[#1a1c27]/90 backdrop-blur-sm p-2 shadow-[2px_2px_0px_#000000] transition-all hover:border-[#ffd60a]"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black bg-[#12110c]">
                      {mod.url ? (
                        <img src={mod.url} alt="" className="size-full object-contain p-1" />
                      ) : (
                        <Package className="size-4 text-[#9aa1b2]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-xs font-bold text-[#f4f5f8] group-hover:text-[#ffd60a] transition-colors">
                          {mod.title}
                        </span>
                        {mod.version ? (
                          <span className="shrink-0 rounded border border-black bg-[#28251c] px-1.5 py-0.2 text-[10px] text-[#9aa1b2]">
                            {mod.version}
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-[11px] text-[#9aa1b2]/80">
                        {mod.desc || t("Fabric mod")}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-32 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#28251c] p-3 text-center text-xs text-[#9aa1b2]">
                  <Package className="size-5 opacity-40" />
                  <span>{t("No mods installed yet.")}</span>
                </div>
              )}
            </div>

            <div className="relative z-10 mt-auto pt-2 border-t border-black/40 flex justify-end">
              <Button
                size="sm"
                onClick={() => { setContentMode("browse"); setContentOpen(true); }}
              >
                <Plus className="size-3.5" />
                <span>{t("Browse more mods")}</span>
              </Button>
            </div>
          </section>

          {/* 4. Wardrobe Bento Tile (4 cols) */}
          <section className="relative col-span-12 md:col-span-6 xl:col-span-4 flex flex-col overflow-hidden rounded-2xl border-2 border-black bg-[#151720]/80 backdrop-blur-md p-5 shadow-[4px_4px_0px_#000000]">
            {/* Minecraft Background with overlay */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
              <img
                src="../assets/home-bg-2.jpg"
                alt=""
                className="size-full object-cover opacity-20 scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#151720] via-[#151720]/85 to-[#151720]/60" />
            </div>

            <div className="relative z-10 flex items-center justify-between pb-2 border-b border-black/40">
              <div>
                <h2 className="text-sm font-bold text-[#f4f5f8] uppercase tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{t("Wardrobe")}</h2>
                <p className="text-[11px] text-[#9aa1b2]">
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

            {/* Horizontal Scrollable Skins Gallery (Face Head Only) */}
            <div className="relative z-10 my-auto py-3">
              {skins.length > 0 ? (
                <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 px-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#ffd60a]/30 hover:[&::-webkit-scrollbar-thumb]:bg-[#ffd60a]">
                  {skins.map((s, idx) => {
                    const isWorn = s.active || (!skins.some((sk) => sk.active) && idx === 0);
                    const skinUrl = s.previewDataUrl || s.previewFileUrl || s.texture || (isWorn ? resolveSkinTexture(status) : "");
                    return (
                      <div
                        key={s.id || idx}
                        onClick={async () => {
                          if (s.id) {
                            try {
                              await api()?.equipSkin(s.id);
                              await refresh();
                            } catch (e) {
                              notify(String(e?.message || e), "error");
                            }
                          }
                        }}
                        className={cn(
                          "group relative flex size-20 shrink-0 cursor-pointer items-center justify-center rounded-2xl border-2 p-1.5 transition-all hover:scale-105 active:scale-95",
                          isWorn
                            ? "border-black bg-[#1a1c27]/95 shadow-[3px_3px_0px_#000000]"
                            : "border-black bg-[#10121a]/90 hover:border-[#ffd60a]/60 shadow-[2px_2px_0px_#000000]"
                        )}
                        title={s.name || `Skin ${idx + 1}`}
                      >
                        <PlayerHead
                          skinUrl={skinUrl}
                          name={s.name || profile?.name || "Player"}
                          size={64}
                          className="size-full rounded-xl"
                        />

                        {isWorn ? (
                          <span className="absolute -bottom-1 -right-1 rounded border-2 border-black bg-[#ffd60a] px-1.5 py-0.5 font-pixel text-[8px] font-bold text-[#0f0e0c] shadow-[1px_1px_0px_#000000]">
                            ACTIVE
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-[#9aa1b2]">
                  <Shirt className="size-8 text-[#9aa1b2]/40 mb-1" />
                  <span>{t("No skins saved yet.")}</span>
                </div>
              )}
            </div>

            <div className="relative z-10 mt-auto pt-2 border-t border-black/40 flex justify-end">
              <Button
                size="sm"
                onClick={() => go("wardrobe")}
              >
                <Plus className="size-3.5" />
                <span>{t("Add skin")}</span>
              </Button>
            </div>
          </section>

          {/* 5. Servers Bento Tile (4 cols) */}
          <section className="relative col-span-12 md:col-span-12 xl:col-span-4 flex flex-col overflow-hidden rounded-2xl border-2 border-black bg-[#151720]/80 backdrop-blur-md p-5 shadow-[4px_4px_0px_#000000]">
            {/* Minecraft Background with overlay */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
              <img
                src="../assets/home-bg-1.jpg"
                alt=""
                className="size-full object-cover opacity-20 scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#151720] via-[#151720]/85 to-[#151720]/60" />
            </div>

            <div className="relative z-10 flex items-center justify-between pb-2 border-b border-black/40">
              <div>
                <h2 className="text-sm font-bold text-[#f4f5f8] uppercase tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{t("Servers")}</h2>
                <p className="text-[11px] text-[#9aa1b2] mt-0.5">{t("Multiplayer servers")}</p>
              </div>
            </div>

            <div className="relative z-10 my-3 flex-1 space-y-2">
              {servers.length > 0 ? (
                reachableServers.slice(0, 2).map((srv) => (
                  <div
                    key={srv.name}
                    className="flex items-center justify-between rounded-xl border-2 border-black bg-[#1a1c27]/90 backdrop-blur-sm p-2.5 shadow-[2px_2px_0px_#000000]"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="truncate text-xs font-bold text-[#f4f5f8]">{srv.name}</div>
                      <div className="truncate text-[11px] text-[#9aa1b2]">
                        {srv.players ? `${srv.players.online}/${srv.players.max} online` : "Online"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => launch(srv.ip)}
                      disabled={disabled}
                      className="rounded-lg border-2 border-black bg-[#ffd60a] px-3 py-1 text-xs font-bold text-[#0f0e0c] shadow-[1px_1px_0px_#000000] hover:translate-x-0.5 hover:translate-y-0.5"
                    >
                      {t("Join")}
                    </button>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-3 text-center">
                  <Server className="size-7 text-[#9aa1b2]/40 mb-1" />
                  <span className="text-xs font-bold text-[#f4f5f8]">{t("No servers yet")}</span>
                  <p className="text-[11px] text-[#9aa1b2] mt-0.5">{t("Servers you join show up here.")}</p>
                </div>
              )}
            </div>

            <div className="relative z-10 mt-auto pt-2 border-t border-black/40 flex items-center justify-end gap-2.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => notify(t("Use In-Game Multiplayer to add servers."), "info")}
              >
                {t("Add server")}
              </Button>
              <Button
                size="sm"
                onClick={() => notify(t("Browse popular servers in community hub."), "info")}
              >
                {t("Browse popular")}
              </Button>
            </div>
          </section>

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
        key={contentMode}
        open={contentOpen}
        onOpenChange={setContentOpen}
        title={contentMode === "installed" ? t("Installed mods") : t("Browse mods and content")}
        description={contentMode === "installed" ? t("View, toggle, update and remove installed mods.") : t("Browse Modrinth and CurseForge for mods, resource packs and shaders.")}
        status={status}
        refresh={refresh}
        notify={notify}
        defaultMode={contentMode}
      />
    </div>
  );
}
