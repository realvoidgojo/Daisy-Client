import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "../lib/useStatus";
import { cn } from "../lib/utils";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useModern } from "../lib/ui-style";
import { useT } from "../i18n/context.jsx";

/** Fabric's and Forge's marks, as Modrinth draws them for its loader filters. */
function FabricIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path strokeWidth="23" transform="matrix(.08671 0 0 .0867 -49.8 -56)" d="m820 761-85.6-87.6c-4.6-4.7-10.4-9.6-25.9 1-19.9 13.6-8.4 21.9-5.2 25.4 8.2 9 84.1 89 97.2 104 2.5 2.8-20.3-22.5-6.5-39.7 5.4-7 18-12 26-3 6.5 7.3 10.7 18-3.4 29.7-24.7 20.4-102 82.4-127 103-12.5 10.3-28.5 2.3-35.8-6-7.5-8.9-30.6-34.6-51.3-58.2-5.5-6.3-4.1-19.6 2.3-25 35-30.3 91.9-73.8 111.9-90.8" />
    </svg>
  );
}

function ForgeIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 7.5h8v-2h12v2s-7 3.4-7 6 3.1 3.1 3.1 3.1l.9 3.9H5l1-4.1s3.8.1 4-2.9c.2-2.7-6.5-.7-8-6Z" />
    </svg>
  );
}

function NeoForgeIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m12 19.2v2m0-2v2" />
      <path d="m8.4 1.3c0.5 1.5 0.7 3 0.1 4.6-0.2 0.5-0.9 1.5-1.6 1.5m8.7-6.1c-0.5 1.5-0.7 3-0.1 4.6 0.2 0.6 0.9 1.5 1.6 1.5" />
      <path d="m3.6 15.8h-1.7m18.5 0h1.7" />
      <path d="m3.2 12.1h-1.7m19.3 0h1.8" />
      <path d="m8.1 12.7v1.6m7.8-1.6v1.6" />
      <path d="m10.8 18h1.2m0 1.2-1.2-1.2m2.4 0h-1.2m0 1.2 1.2-1.2" />
      <path d="m4 9.7c-0.5 1.2-0.8 2.4-0.8 3.7 0 3.1 2.9 6.3 5.3 8.2 0.9 0.7 2.2 1.1 3.4 1.1m0.1-17.8c-1.1 0-2.1 0.2-3.2 0.7m11.2 4.1c0.5 1.2 0.8 2.4 0.8 3.7 0 3.1-2.9 6.3-5.3 8.2-0.9 0.7-2.2 1.1-3.4 1.1m-0.1-17.8c1.1 0 2.1 0.2 3.2 0.7" />
      <path d="m4 9.7c-0.2-1.8-0.3-3.7 0.5-5.5s2.2-2.6 3.9-3m11.6 8.5c0.2-1.9 0.3-3.7-0.5-5.5s-2.2-2.6-3.9-3" />
      <path d="m12 21.2-2.4 0.4m2.4-0.4 2.4 0.4" />
    </svg>
  );
}

function QuiltIcon({ className }) {
  const square = "M442.5 233.9c0-6.4-5.2-11.6-11.6-11.6h-197c-6.4 0-11.6 5.2-11.6 11.6v197c0 6.4 5.2 11.6 11.6 11.6h197c6.4 0 11.6-5.2 11.6-11.7v-197Z";
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={square} strokeWidth="65.6" transform="matrix(.03053 0 0 .03046 -3.2 -3.2)" />
      <path d={square} strokeWidth="65.6" transform="matrix(.03053 0 0 .03046 -3.2 7)" />
      <path d={square} strokeWidth="65.6" transform="matrix(.03053 0 0 .03046 6.9 -3.2)" />
      <path strokeWidth="70.4" transform="rotate(45 3.5 24) scale(.02843 .02835)" d="M442.5 234.8c0-7-5.6-12.5-12.5-12.5H234.7c-6.8 0-12.4 5.6-12.4 12.5V430c0 6.9 5.6 12.5 12.4 12.5H430c6.9 0 12.5-5.6 12.5-12.5V234.8Z" />
    </svg>
  );
}

function LoaderIcon({ id, className }) {
  if (id === "daisy") {
    return (
      <span className="inline-flex items-center gap-1">
        <FabricIcon className={className} />
        <img src="../assets/daisy-logo.png" alt="" draggable={false} className="size-6 object-contain" />
      </span>
    );
  }
  if (id === "fabric") return <FabricIcon className={className} />;
  if (id === "forge") return <ForgeIcon className={className} />;
  if (id === "neoforge") return <NeoForgeIcon className={className} />;
  if (id === "quilt") return <QuiltIcon className={className} />;
  return <img src="../assets/loaders/grass-block.png" alt="" draggable={false} className={cn("object-contain", className)} />;
}

/*
  What a new instance runs. Only "Fabric + Daisy" gets Daisy in game; plain Fabric, Forge and
  vanilla are Minecraft without it. `api` is what main lists versions under.
*/
const LOADERS = [
  { id: "daisy", label: "Fabric + Daisy", prefix: "Daisy", loader: "fabric", api: "fabric" },
  { id: "fabric", label: "Fabric", prefix: "Fabric", loader: "fabric", api: "fabric-plain" },
  { id: "forge", label: "Forge", prefix: "Forge", loader: "forge", api: "forge" },
  { id: "neoforge", label: "NeoForge", prefix: "NeoForge", loader: "neoforge", api: "neoforge" },
  { id: "quilt", label: "Quilt", prefix: "Quilt", loader: "quilt", api: "quilt" },
  { id: "vanilla", label: "Vanilla", prefix: "Minecraft", loader: "vanilla", api: "vanilla" }
];

export function loaderPrefix(loader) {
  return LOADERS.find((item) => item.id === loader)?.prefix || "Daisy";
}

export function loaderOption(id) {
  return LOADERS.find((item) => item.id === id) || LOADERS[0];
}

/** "Fabric", "Forge" or "Vanilla", as the instance card shows it. */
export function loaderName(loader) {
  const id = String(loader || "fabric").toLowerCase();
  return id === "forge" ? "Forge" : id === "vanilla" ? "Vanilla" : id === "neoforge" ? "NeoForge" : id === "quilt" ? "Quilt" : "Fabric";
}

export function LoaderPicker({ loader, onChange }) {
  const t = useT();
  const modern = useModern();
  return (
    <div className={cn("grid grid-cols-3 gap-2", modern && "gap-2.5")} role="radiogroup" aria-label={t("Loader")}>
      {LOADERS.map((item) => {
        const on = loader === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(item.id)}
            className={cn(
              "flex min-w-0 flex-col items-center justify-center gap-1.5 border-2 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              modern ? "h-16 rounded-xl px-2" : "h-[58px] rounded-lg px-1.5",
              on
                ? "border-primary bg-primary/20 text-primary shadow-[2px_2px_0px_#080808]"
                : "border-border/70 bg-card text-muted-foreground hover:border-border hover:bg-accent/60 hover:text-foreground"
            )}
          >
            <LoaderIcon id={item.id} className={cn("size-6", on ? "text-primary" : "")} />
            <span className="max-w-full truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Every Forge or vanilla release since 1.8, newest first, fetched when the loader is picked. */
export function usePlainVersions(open, loader) {
  const [lists, setLists] = useState({});
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open || loader === "daisy" || lists[loader]) return;
    let live = true;
    setError("");
    api()?.getGameVersions?.(loaderOption(loader).api).then((res) => {
      if (!live) return;
      if (res?.ok && res.versions?.length) setLists((prev) => ({ ...prev, [loader]: res.versions }));
      else setError(res?.message || "Could not load the version list.");
    }).catch((e) => live && setError(String(e?.message || e)));
    return () => { live = false; };
  }, [open, loader, lists]);
  return { list: lists[loader] || null, error };
}

export function PlainVersionSelect({ loader, list, error, value, onChange, available }) {
  const t = useT();
  if (error) return <p className="text-sm text-destructive">{t(error)}</p>;
  if (!list) {
    return (
      <div className="flex h-10 w-full items-center gap-2 rounded-md border border-border/60 bg-card px-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-primary" />{t("Loading versions...")}
      </div>
    );
  }

  // Create a fast lookup for recommended / curated versions
  const recSet = new Set(
    (available || []).filter((a) => a.status === "Primary" || a.selected).map((a) => a.id)
  );

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={t("Minecraft version")} className="h-10 w-full bg-card border-border/60 hover:border-border transition-colors">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {list.map((v) => {
          const isRec = recSet.has(v.id) || v.recommended;
          const label = loader === "daisy"
            ? `Daisy ${v.id}`
            : loader === "vanilla"
              ? v.id
              : `${v.id}  ·  ${loader === "fabric" || loader === "quilt" ? "Loader" : loaderOption(loader).label} ${v.loaderVersion || ""}`.trim();
          return (
            <SelectItem key={v.id} value={v.id}>
              <div className="flex w-full items-center justify-between gap-4">
                <span>{label}</span>
                {isRec && (
                  <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                    {t("Recommended")}
                  </span>
                )}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

/** "26.2" and "26.1.2" under 26.x, "1.21.11" and "1.21" under 1.21.x, in the order given. */
function versionGroups(list) {
  const groups = [];
  for (const entry of list) {
    const parts = String(entry.id).split(".");
    const key = parts[0] === "1" ? `${parts[0]}.${parts[1]}` : parts[0];
    let group = groups.find((item) => item.key === key);
    if (!group) {
      group = { key, label: `${key}.x`, versions: [] };
      groups.push(group);
    }
    group.versions.push(entry);
  }
  return groups;
}

/**
 * Unified Version Picker that provides an elegant, zero-jump layout across all loaders.
 * Every loader uses the clean dropdown menu with instant version selection.
 */
export function ElegantVersionPicker({ loader, value, onChange, available, plainList, plainError }) {
  const t = useT();

  if (loader === "daisy") {
    // For Fabric + Daisy, provide all supported versions in the dropdown
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t("Minecraft version")}</Label>
          <span className="text-[11px] text-muted-foreground">
            {t("{count} versions available", { count: available.length })}
          </span>
        </div>
        <PlainVersionSelect
          loader={loader}
          list={available}
          error=""
          value={value}
          onChange={onChange}
          available={available}
        />
      </div>
    );
  }

  // Plain loaders (Fabric, Forge, NeoForge, Quilt, Vanilla)
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{t("Minecraft version")}</Label>
        {plainList && (
          <span className="text-[11px] text-muted-foreground">
            {t("{count} versions available", { count: plainList.length })}
          </span>
        )}
      </div>
      <PlainVersionSelect
        loader={loader}
        list={plainList}
        error={plainError}
        value={value}
        onChange={onChange}
        available={available}
      />
    </div>
  );
}

