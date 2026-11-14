import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2, Save, Repeat, Check, Plus, Image as ImageIcon } from "lucide-react";
import { api } from "../lib/useStatus";
import { cn } from "../lib/utils";
import { PlayerHead } from "./player-head";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { useT } from "../i18n/context.jsx";

export function LocalAccountManager({ status, refresh, notify }) {
  const t = useT();
  const [profiles, setProfiles] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [username, setUsername] = useState("");
  const [skinDataUrl, setSkinDataUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api()?.getProfiles();
      setProfiles(Array.isArray(res?.profiles) ? res.profiles : []);
      setActiveId(res?.activeId || null);
    } catch {}
  }, []);

  useEffect(() => {
    load();
  }, [load, status?.auth?.signedIn, status?.auth?.profileId, status?.auth?.profile?.skinUrl, status?.skinHistory]);

  const handlePickSkin = async () => {
    try {
      const res = await api()?.pickSkinFile?.();
      if (res?.ok && res.dataUrl) {
        setSkinDataUrl(res.dataUrl);
        notify?.(t("Skin image selected"), "info");
      }
    } catch (e) {
      notify?.(e.message, "error");
    }
  };

  const handleAddAccount = async (e) => {
    if (e) e.preventDefault();
    if (!username.trim()) return;
    setBusy(true);
    try {
      const res = await api()?.setOfflineAccount(username.trim(), skinDataUrl || undefined);
      if (res?.ok) {
        notify?.(t("Account added: {name}", { name: username.trim() }), "success");
        setUsername("");
        setSkinDataUrl("");
        setAdding(false);
        await load();
        await refresh();
      } else {
        notify?.(res?.message || t("Could not add account."), "error");
      }
    } catch (err) {
      notify?.(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleSwitch = async (profile) => {
    setBusy(profile.id);
    try {
      const res = await api()?.switchProfile(profile.id);
      if (res?.ok) {
        notify?.(t("Switched to {name}", { name: profile.name }), "success");
        await load();
        await refresh();
      } else {
        notify?.(res?.message || t("Could not switch accounts."), "error");
      }
    } catch (e) {
      notify?.(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (profile) => {
    setBusy(`remove-${profile.id}`);
    try {
      await api()?.removeProfile(profile.id);
      notify?.(t("Removed account {name}", { name: profile.name }), "info");
      await load();
      await refresh();
    } catch (e) {
      notify?.(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const currentAuthName = status?.auth?.profile?.name || status?.settings?.offlineName || "DaisyPlayer";

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{t("Offline Accounts")}</h3>
          <p className="text-xs text-muted-foreground">{t("Manage multiple offline accounts with custom skins")}</p>
        </div>
        <Button size="sm" variant={adding ? "outline" : "default"} onClick={() => setAdding(!adding)}>
          <Plus className="mr-1.5 size-3.5" />
          {adding ? t("Cancel") : t("Add account")}
        </Button>
      </div>

      {adding ? (
        <form onSubmit={handleAddAccount} className="space-y-3 rounded-lg border border-border bg-background/60 p-3.5">
          <p className="text-xs font-semibold text-primary">{t("New Offline Account")}</p>
          <div className="flex items-center gap-3">
            <div
              onClick={handlePickSkin}
              className="flex size-12 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-card transition-colors hover:border-primary/50"
              title={t("Click to select custom skin image (PNG)")}
            >
              {skinDataUrl ? (
                <PlayerHead skinUrl={skinDataUrl} name={username || "Player"} size={44} />
              ) : (
                <div className="flex flex-col items-center text-muted-foreground">
                  <ImageIcon className="size-4" />
                  <span className="text-[9px] font-medium">{t("Skin")}</span>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-1">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("Username (e.g. sharprazor)")}
                maxLength={16}
                className="text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handlePickSkin}>
              <ImageIcon className="mr-1.5 size-3.5" />
              {skinDataUrl ? t("Change skin PNG") : t("Choose skin PNG")}
            </Button>
            <Button type="submit" size="sm" disabled={busy || !username.trim()}>
              {busy ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Check className="mr-1.5 size-3.5" />}
              {t("Save account")}
            </Button>
          </div>
        </form>
      ) : null}

      <div className="space-y-2">
        {profiles.length === 0 ? (
          <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
            <div className="flex items-center gap-3">
              <PlayerHead skinUrl={status?.auth?.profile?.skinUrl} name={currentAuthName} size={36} />
              <div>
                <p className="text-sm font-semibold">{currentAuthName}</p>
                <p className="text-[11px] text-muted-foreground">{t("Offline account")}</p>
              </div>
            </div>
            <Badge variant="success">{t("Active")}</Badge>
          </div>
        ) : (
          profiles.map((profile) => {
            const active = profile.id === activeId || profile.name === currentAuthName;
            const profileSkin = active ? (status?.auth?.profile?.skinUrl || profile.auth?.profile?.skinUrl) : profile.auth?.profile?.skinUrl;
            return (
              <div
                key={profile.id}
                className={cn(
                  "flex items-center justify-between rounded-xl border-2 p-3.5 transition-colors",
                  active
                    ? "border-primary bg-primary/15 shadow-[2px_2px_0px_#080808]"
                    : "border-border/80 bg-card hover:border-primary/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <PlayerHead skinUrl={profileSkin} name={profile.name} size={36} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground">{profile.name}</p>
                      {active ? <Badge variant="success" className="text-[10px]">{t("Active")}</Badge> : null}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{t("Offline account")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!active ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy === profile.id}
                      onClick={() => handleSwitch(profile)}
                    >
                      {busy === profile.id ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Repeat className="mr-1.5 size-3.5" />}
                      {t("Switch")}
                    </Button>
                  ) : null}
                  {profiles.length > 1 ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      disabled={busy === `remove-${profile.id}`}
                      onClick={() => handleRemove(profile)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

