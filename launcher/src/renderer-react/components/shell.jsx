import React, { useState, useEffect, useCallback } from "react";
import { Home, Boxes, Shirt, Settings, Minus, Square, X, LogIn, ArrowLeftRight, Plus, Check, Loader2, Sparkles, UserRound } from "lucide-react";
import { cn } from "../lib/utils";
import { api } from "../lib/useStatus";
import { useModern } from "../lib/ui-style";
import { PlayerHead, resolveSkinTexture } from "./player-head";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useT } from "../i18n/context.jsx";

export const NAV = [
  { id: "home", label: "Home", icon: Home },
  { id: "instances", label: "Instances", icon: Boxes },
  { id: "wardrobe", label: "Wardrobe", icon: Shirt }
];

/**
 * Narrow icon rail. Settings sits pinned at the bottom, away from the three
 * content views, so the destination you reach least often never competes with
 * the ones you reach constantly.
 */
export function Rail({ view, setView }) {
  const t = useT();
  const item = (entry) => {
    const Icon = entry.icon;
    const active = view === entry.id;
    return (
      <Tooltip key={entry.id} delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            aria-label={t(entry.label)}
            aria-current={active ? "page" : undefined}
            data-tour={`rail-${entry.id}`}
            onClick={() => setView(entry.id)}
            className={cn(
              "no-drag relative flex size-10 shrink-0 items-center justify-center rounded-md transition-colors",
              active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            )}
          >
            {/* The active marker is the one accent in the rail. */}
            <span
              className={cn(
                "absolute left-0 h-5 w-0.5 rounded-r-full bg-primary transition-opacity",
                active ? "opacity-100" : "opacity-0"
              )}
            />
            <Icon className="size-[18px]" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{t(entry.label)}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider>
      <nav className="flex w-14 shrink-0 flex-col items-center gap-1.5 overflow-y-auto overflow-x-hidden border-r-2 border-border/80 bg-card py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="mb-2 text-xs font-black text-primary tracking-widest drop-shadow-[1px_1px_0px_#080808]">DAISY</div>
        {NAV.map(item)}
        <div className="min-h-0 flex-1" />
        {item({ id: "settings", label: "Settings", icon: Settings })}
      </nav>
    </TooltipProvider>
  );
}

/**
 * Interactive Account Switcher Popover from the bottom-left avatar.
 * Matches SKLauncher style: displays active account, list of other offline/online accounts,
 * one-click switch buttons, and quick links to Add Account or Manage in Settings.
 */
export function AccountSwitcherMenu({ status, refresh, notify, setView, children }) {
  const t = useT();
  const [profiles, setProfiles] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api()?.getProfiles();
      setProfiles(Array.isArray(res?.profiles) ? res.profiles : []);
      setActiveId(res?.activeId || null);
    } catch { }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load, status?.auth?.signedIn, status?.auth?.profileId]);

  const currentAuthName = status?.auth?.profile?.name || status?.settings?.offlineName || "DaisyPlayer";

  const handleSwitch = async (profile) => {
    setBusy(profile.id);
    try {
      const res = await api()?.switchProfile(profile.id);
      if (res?.ok) {
        notify?.(t("Switched to {name}", { name: profile.name }), "success");
        await load();
        await refresh?.();
        setOpen(false);
      } else {
        notify?.(res?.message || t("Could not switch accounts."), "error");
      }
    } catch (e) {
      notify?.(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const activeProfile = profiles.find((p) => p.id === activeId || p.name === currentAuthName);
  const otherProfiles = profiles.filter((p) => (p.id !== activeId && p.name !== currentAuthName));
  const activeSkin = status?.auth?.profile?.skinUrl || activeProfile?.auth?.profile?.skinUrl;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="right"
        align="end"
        sideOffset={14}
        className="w-72 rounded-2xl border-2 border-daisy-ink bg-popover/98 p-3 shadow-[6px_6px_0px_#000000] backdrop-blur-xl animate-in fade-in-0 zoom-in-95"
      >
        {/* Active Account Header */}
        <div className="flex items-center justify-between rounded-xl border border-primary/40 bg-primary/10 p-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <PlayerHead skinUrl={activeSkin} name={currentAuthName} size={38} className="rounded-lg border border-black/40" />
              <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border border-black bg-emerald-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-extrabold text-foreground">{currentAuthName}</div>
              <div className="text-[11px] font-medium text-muted-foreground">{t("Active account")}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setOpen(false); setView?.("wardrobe"); }}
            title={t("Open wardrobe")}
            className="flex size-7 items-center justify-center rounded-lg border border-border/80 bg-background/80 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Shirt className="size-3.5" />
          </button>
        </div>

        {/* Other Accounts Section */}
        {otherProfiles.length > 0 ? (
          <div className="mt-3 space-y-1">
            <div className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              {t("Other accounts")}
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto pr-0.5">
              {otherProfiles.map((p) => (
                <div
                  key={p.id}
                  className="group flex items-center justify-between rounded-xl border border-border/70 bg-card/60 p-2 transition-all hover:border-primary/50 hover:bg-accent/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <PlayerHead skinUrl={p.auth?.profile?.skinUrl} name={p.name} size={30} className="rounded-md" />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-foreground">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground">{t("Offline account")}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busy === p.id}
                    onClick={() => handleSwitch(p)}
                    title={t("Switch account")}
                    className="flex size-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-all group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground"
                  >
                    {busy === p.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <ArrowLeftRight className="size-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <DropdownMenuSeparator className="my-2.5 bg-border/80" />

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => { setOpen(false); setView?.("settings"); }}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-background/80 py-2 text-xs font-bold text-foreground transition-colors hover:border-primary hover:bg-accent hover:text-primary"
          >
            <Plus className="size-3.5" />
            <span>{t("Add account")}</span>
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); setView?.("wardrobe"); }}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-daisy-ink bg-primary py-2 text-xs font-bold text-primary-foreground shadow-[1px_1px_0px_#000000] transition-transform active:scale-95"
          >
            <Shirt className="size-3.5" />
            <span>{t("Wardrobe")}</span>
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The Modern layout's rail: full window height with the logo in the title bar's place, each
 * destination labelled under its icon, and your account at the bottom. Labels instead of
 * tooltips because the rail is wide enough to say where each button goes, and a label is
 * read at a glance where a tooltip has to be hovered for.
 */
  export function ModernRail({ view, setView, status, refresh, notify }) {
    const t = useT();
    const profile = status?.auth?.profile;

    const item = (entry) => {
      const Icon = entry.icon;
      const active = view === entry.id;
      return (
        <Tooltip key={entry.id} delayDuration={150}>
          <TooltipTrigger asChild>
            <button
              aria-label={t(entry.label)}
              aria-current={active ? "page" : undefined}
              data-tour={`rail-${entry.id}`}
              onClick={() => setView(entry.id)}
              className={cn(
                "no-drag relative flex size-12 shrink-0 items-center justify-center rounded-xl border-2 transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5",
                active
                  ? "border-daisy-ink bg-primary text-primary-foreground shadow-[2px_2px_0px_#000000]"
                  : "border-transparent text-muted-foreground hover:border-border hover:bg-accent/60 hover:text-foreground"
              )}
            >
              <Icon className="size-[22px]" strokeWidth={active ? 2.5 : 2} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-semibold">{t(entry.label)}</TooltipContent>
        </Tooltip>
      );
    };

    return (
      <TooltipProvider>
          <nav className="flex w-[72px] shrink-0 flex-col items-center gap-3 border-r-2 border-border/70 bg-card/95 py-4">
            {/* Brand logo top left without clipping */}
            <div className="drag-region flex h-14 w-full shrink-0 flex-col items-center justify-center gap-1">
                <div className="flex size-10 items-center justify-center rounded-xl border-2 border-daisy-ink bg-[#ffd60a] shadow-[2px_2px_0px_#000000] p-1 overflow-hidden">
                  <img
                    src="assets/daisy-logo.png"
                    alt="Daisy"
                    className="size-full object-contain select-none pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
                    onError={(e) => {
                      // Fallback to crisp SVG icon if image load fails
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling.style.display = 'block';
                    }}
                  />
                  <svg
                    viewBox="0 0 100 100"
                    className="size-7 select-none hidden"
                    fill="none"
                  >
                    <g stroke="#000000" strokeWidth="6" strokeLinejoin="round" fill="#ffffff">
                      <circle cx="50" cy="22" r="15" />
                      <circle cx="74" cy="36" r="15" />
                      <circle cx="74" cy="64" r="15" />
                      <circle cx="50" cy="78" r="15" />
                      <circle cx="26" cy="64" r="15" />
                      <circle cx="26" cy="36" r="15" />
                    </g>
                    <circle cx="50" cy="50" r="18" fill="#ffd60a" stroke="#000000" strokeWidth="6" />
                    <circle cx="43" cy="46" r="2.5" fill="#000000" />
                    <circle cx="57" cy="46" r="2.5" fill="#000000" />
                    <path d="M43 54 Q50 60 57 54" stroke="#000000" strokeWidth="3" strokeLinecap="round" fill="none" />
                  </svg>
                </div>
                <span className="text-[10px] font-black tracking-widest text-primary select-none leading-none">DAISY</span>
              </div>

              <div className="my-1 w-9 h-[2px] bg-border/60" />

              {NAV.map(item)}
              <div className="min-h-0 flex-1" />
              {item({ id: "settings", label: "Settings", icon: Settings })}

              {/* Bottom account icon with full account-switch popover menu */}
              <AccountSwitcherMenu status={status} refresh={refresh} notify={notify} setView={setView}>
                <button
                  type="button"
                  aria-label={t("Switch account")}
                  className="no-drag relative flex size-12 shrink-0 items-center justify-center rounded-xl border-2 border-daisy-ink p-1 transition-transform hover:scale-105 active:scale-95 shadow-[2px_2px_0px_#000000] bg-[#ffd60a]/20"
                >
                  <PlayerHead
                    skinUrl={resolveSkinTexture(status)}
                    name={profile?.name || status?.settings?.offlineName || "Player"}
                    size={36}
                    className="rounded-lg"
                  />
                  <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full border border-black bg-primary text-primary-foreground shadow-sm">
                    <ArrowLeftRight className="size-2.5 stroke-[2.5]" />
                  </span>
                </button>
              </AccountSwitcherMenu>
          </nav>
      </TooltipProvider>
    );
  }

  /** Frameless title bar: the whole strip drags, the controls opt out. */
  export function TitleBar({ title, modern = false }) {
    const t = useT();
    const send = (action) => api()?.windowAction(action);
    const control = (label, Icon, action, danger) => (
      <button
        aria-label={label}
        onClick={() => send(action)}
        className={cn(
          "no-drag flex h-8 w-11 items-center justify-center text-muted-foreground transition-colors",
          danger ? "hover:bg-destructive hover:text-destructive-foreground" : "hover:bg-accent hover:text-foreground"
        )}
      >
        <Icon className="size-3.5" />
      </button>
    );

    return (
      <header
        className={cn(
          "drag-region flex h-8 shrink-0 items-center justify-between",
          // Modern: the bar is part of the page canvas (the rail already shows the logo), and it
          // sits above the launch screen so the window controls keep working under it.
          modern ? "relative z-50" : "border-b border-border bg-card"
        )}
      >
        <span className="select-none px-3 text-xs font-medium text-muted-foreground">{modern ? "" : title}</span>
        <div className="flex items-center">
          {control(t("Minimize"), Minus, "minimize")}
          {control(t("Maximize"), Square, "maximize")}
          {control(t("Close"), X, "close", true)}
        </div>
      </header>
    );
  }

  /** Consistent page frame so every view lines up on the same grid. */
  export function Page({ title, description, actions, children }) {
    const modern = useModern();
    if (modern) {
      return (
        <div className="flex h-full flex-col overflow-hidden">
          <div className="flex items-end justify-between gap-4 px-8 pb-6 pt-3">
            <div className="min-w-0">
              <h1 className="truncate text-[26px] font-extrabold leading-tight tracking-[-0.02em]">{title}</h1>
              {description ? <p className="mt-1 text-[13px] text-muted-foreground">{description}</p> : null}
            </div>
            {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-8">{children}</div>
        </div>
      );
    }
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-5">
          <div className="space-y-0.5">
            <h1 className="text-lg font-semibold leading-tight">{title}</h1>
            {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
      </div>
    );
  }

  /** Small labelled row used across Settings and instance detail. */
  export function Field({ label, hint, children }) {
    const modern = useModern();
    return (
      <div className={cn("flex items-center justify-between gap-6", modern ? "py-3.5" : "py-2.5")}>
        <div className="min-w-0 space-y-0.5">
          <div className={cn("text-sm", modern ? "font-semibold" : "font-medium")}>{label}</div>
          {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      </div>
    );
  }

  export function EmptyState({ icon: Icon, title, description, action }) {
    const modern = useModern();
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 border border-dashed text-center",
          modern ? "rounded-xl border-border/70 py-16" : "rounded-lg border-border py-14"
        )}
      >
        {Icon ? <Icon className="size-7 text-muted-foreground" /> : null}
        <div className="space-y-1">
          <div className="text-sm font-medium">{title}</div>
          {description ? <p className="max-w-sm text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
    );
  }
