import React from "react";
import { CircleCheck, TriangleAlert, Info } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { useT } from "../i18n/context.jsx";

export function RepairResultDialog({ result, onOpenChange }) {
  const t = useT();
  const open = Boolean(result);
  const updated = result?.updated || [];
  const blockers = result?.blockers || [];
  const conflicts = result?.conflicts || [];
  const allClear = !updated.length && !blockers.length && !conflicts.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Repaired {name}", { name: result?.name })}</DialogTitle>
          <DialogDescription>
            {t("Folders and required mods were checked, and every Modrinth-tracked mod was checked for updates.")}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
          {allClear ? (
            <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-3 text-sm">
              <CircleCheck className="size-4 text-success" />
              {t("Everything checks out. No updates were needed and no incompatibilities were found.")}
            </div>
          ) : null}

          {updated.length ? (
            <section className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <CircleCheck className="size-4 text-success" />
                {t("Updated {count} mod{plural}", { count: updated.length, plural: updated.length === 1 ? "" : "s" })}
              </h3>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {updated.map((name, i) => <li key={i} className="truncate">{name}</li>)}
              </ul>
            </section>
          ) : null}

          {blockers.length ? (
            <section className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <TriangleAlert className="size-4" />
                {t("Needs your attention")}
              </h3>
              <ul className="space-y-1.5">
                {blockers.map((issue, i) => (
                  <li key={i} className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2">
                    <div className="text-xs font-medium">{issue.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{issue.message}</div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {conflicts.length ? (
            <section className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Info className="size-4 text-muted-foreground" />
                {t("Good to know")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("These mods declare a soft conflict. They usually run together fine and nothing is blocked - it is only worth a look if one of them starts misbehaving.")}
              </p>
              <ul className="space-y-1.5">
                {conflicts.map((issue, i) => (
                  <li key={i} className="rounded-md border border-border bg-card px-3 py-2">
                    <div className="text-xs font-medium">{issue.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{issue.message}</div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{t("Done")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

