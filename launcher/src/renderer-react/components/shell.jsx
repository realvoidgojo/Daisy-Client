import React from "react";
import { Home, Boxes, Shirt, Settings, Minus, Square, X, LogIn } from "lucide-react";
import { cn } from "../lib/utils";
import { api } from "../lib/useStatus";
import { useModern } from "../lib/ui-style";
import { PlayerHead, resolveSkinTexture } from "./player-head";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
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

/** Colour of the availability dot on the account button, from the theme tokens. */
const PRESENCE_COLOR = {
  online: "var(--success)",
  idle: "var(--warning)",
  dnd: "var(--destructive)",
  invisible: "var(--muted-foreground)"
};

/**
 * The Modern layout's rail: full window height with the logo in the title bar's place, each
 * destination labelled under its icon, and your account at the bottom. Labels instead of
 * tooltips because the rail is wide enough to say where each button goes, and a label is
 * read at a glance where a tooltip has to be hovered for.
 */
export function ModernRail({ view, setView, status }) {
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
              "no-drag relative flex size-11 shrink-0 items-center justify-center rounded-xl border-2 transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5",
              active
                ? "border-black bg-[#ffd60a] text-[#0f0e0c] shadow-[2px_2px_0px_#000000]"
                : "border-transparent text-[#b8b2a3] hover:border-[#333129] hover:bg-white/[0.04] hover:text-[#fffdf2]"
            )}
          >
            <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-semibold">{t(entry.label)}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider>
      <nav className="flex w-[68px] shrink-0 flex-col items-center gap-3 border-r-2 border-[#1e212d] bg-[#10121a] py-4">
        {/* Brand logo top left without clipping */}
        <div className="drag-region flex h-14 w-full shrink-0 flex-col items-center justify-center gap-1">
          <div className="flex size-9 items-center justify-center rounded-xl border-2 border-black bg-[#ffd60a] shadow-[2px_2px_0px_#000000] p-1 overflow-hidden">
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
              className="size-6 select-none hidden"
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
          <span className="text-[10px] font-black tracking-widest text-[#ffd60a] select-none leading-none">DAISY</span>
        </div>

        <div className="my-1 w-8 h-[2px] bg-[#1e212d]" />

        {NAV.map(item)}
        <div className="min-h-0 flex-1" />
        {item({ id: "settings", label: "Settings", icon: Settings })}

        {profile ? (
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setView("wardrobe")}
                aria-label={t("Wardrobe")}
                className="no-drag relative rounded-xl border-2 border-black p-0.5 transition-transform hover:scale-105 shadow-[2px_2px_0px_#000000] bg-[#ffd60a]/20"
              >
                <PlayerHead skinUrl={resolveSkinTexture(status)} name={profile.name} size={32} className="rounded-lg" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-semibold">{profile.name}</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <button
                onClick={() => api()?.microsoftLogin()}
                aria-label={t("Sign in")}
                className="no-drag flex size-10 items-center justify-center rounded-xl border-2 border-dashed border-[#ffd60a]/50 text-[#b8b2a3] shadow-[2px_2px_0px_#000000] transition-all hover:border-[#ffd60a] hover:bg-[#ffd60a] hover:text-[#0f0e0c]"
              >
                <LogIn className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-semibold">{t("Sign in")}</TooltipContent>
          </Tooltip>
        )}
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
