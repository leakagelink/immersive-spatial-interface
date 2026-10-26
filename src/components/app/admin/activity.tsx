import { useMemo, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Empty, FilterPills, GhostButton } from "../ui3d";
import { cn } from "@/lib/utils";
import { fmt, useStore, type ActivityKind } from "@/lib/store";
import { Pill, Row, Section } from "./parts";

const KINDS: { v: "all" | ActivityKind; l: string }[] = [
  { v: "all", l: "All" },
  { v: "stock", l: "Stock" },
  { v: "price", l: "Prices" },
  { v: "bill", l: "Bills" },
  { v: "add", l: "Added" },
  { v: "edit", l: "Edited" },
  { v: "delete", l: "Deleted" },
  { v: "restore", l: "Restored" },
];

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function ActivityAdmin() {
  const { activity, trash, undoTrash, clearTrash, products, vendors, categories, bills, entries } = useStore();
  const [f, setF] = useState<"all" | ActivityKind>("all");

  const list = useMemo(() => (f === "all" ? activity : activity.filter((a) => a.kind === f)), [activity, f]);

  return (
    <div className="space-y-5">
      <Section
        title="Recently deleted"
        hint="Anything you delete goes here first, so a mistake is not the end of the day."
        action={
          trash.length > 0 ? (
            <GhostButton className="shrink-0 text-destructive" onClick={() => confirm("Clear the restore list?") && (clearTrash(), toast.success("Trash cleared"))}>
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Clear</span>
            </GhostButton>
          ) : undefined
        }
      >
        {trash.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing waiting here right now.</p>
        ) : (
          <div className="space-y-2">
            {trash.map((t, i) => (
              <Row key={t.id} delay={i}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-destructive/12 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{t.label}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {t.kind} · {when(t.at)}
                  </div>
                </div>
                <button
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground"
                  onClick={() => {
                    undoTrash(t.id);
                    toast.success(`${t.label} restored`);
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore
                </button>
              </Row>
            ))}
          </div>
        )}
      </Section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="glass rounded-2xl p-4">
          <div className="font-display text-xl font-bold tabular-nums">{products.length}</div>
          <div className="text-xs text-muted-foreground">products</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="font-display text-xl font-bold tabular-nums">{vendors.length}</div>
          <div className="text-xs text-muted-foreground">vendors</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="font-display text-xl font-bold tabular-nums">{categories.length}</div>
          <div className="text-xs text-muted-foreground">categories</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="font-display text-xl font-bold tabular-nums">
            {entries.length} / {bills.length}
          </div>
          <div className="text-xs text-muted-foreground">stock entries / bills</div>
        </div>
      </div>

      <Section title="Activity log" hint="What changed in the shop, newest first. The last 200 changes are kept.">
        <div className="mb-3">
          <FilterPills value={f} onChange={(v) => setF(v)} options={KINDS.map((k) => ({ value: k.v, label: k.l }))} />
        </div>
        {list.length === 0 ? (
          <Empty title="Nothing logged yet" hint="Changes you make will show up here." />
        ) : (
          <div className="space-y-2">
            {list.map((a, i) => (
              <Row key={a.id} delay={i}>
                <Pill
                  tone={a.kind === "delete" ? "bad" : a.kind === "add" || a.kind === "restore" ? "good" : a.kind === "price" || a.kind === "stock" ? "info" : "warn"}
                >
                  {a.kind}
                </Pill>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{a.text}</div>
                  <div className="text-[11px] text-muted-foreground">{when(a.at)}</div>
                </div>
                {a.trashId && (
                  <button
                    className={cn("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold ring-1 ring-primary")}
                    onClick={() => {
                      undoTrash(a.trashId!);
                      toast.success("Restored");
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Undo
                  </button>
                )}
              </Row>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

export const _fmtGuard = fmt;
