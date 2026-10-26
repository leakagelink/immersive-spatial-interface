import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, inputCls, EMOJIS } from "@/components/app/forms";
import { Cube3D, Empty, Page, PageHeader, PrimaryButton, SearchBox } from "@/components/app/ui3d";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/categories/")({
  head: () => ({
    meta: [
      { title: "Categories — Rj Store" },
      { name: "description", content: "Browse products by category: bakery, snacks, chocolates, juices and more." },
      { property: "og:title", content: "Categories — Rj Store" },
      { property: "og:description", content: "Browse products by category." },
    ],
  }),
  component: Categories,
});

function Categories() {
  const { categories, products, addCategory } = useStore();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📦");
  const list = categories.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));
  const save = () => {
    if (!name.trim()) return toast.error("Category name is required");
    addCategory({ name: name.trim(), icon, hue: Math.floor(Math.random() * 360) });
    toast.success("Category added");
    setName(""); setIcon("📦"); setOpen(false);
  };
  return (
    <Page>
      <PageHeader title="Categories" subtitle={`${categories.length} categories`} back actions={<PrimaryButton className="h-11 px-4" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /></PrimaryButton>} />
      <div className="mb-4"><SearchBox value={q} onChange={setQ} placeholder="Search categories…" /></div>
      {list.length === 0 ? <Empty title="No categories" /> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((c, i) => (
            <Link key={c.id} to="/categories/$categoryId" params={{ categoryId: c.id }} className="glass animate-rise flex items-center gap-4 rounded-3xl p-4 transition hover:-translate-y-1" style={{ animationDelay: `${i * 40}ms` }}>
              <Cube3D hue={c.hue}>{c.icon}</Cube3D>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display font-bold">{c.name}</div>
                <div className="text-sm text-muted-foreground">{products.filter((p) => p.categoryId === c.id).length} Products</div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl border-border bg-popover">
          <DialogHeader><DialogTitle className="font-display">Add Category</DialogTitle></DialogHeader>
          <Field label="Name" required><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dairy" autoFocus /></Field>
          <Field label="Icon">
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS.map((e) => (
                <button key={e} onClick={() => setIcon(e)} className={cn("grid h-10 w-10 place-items-center rounded-xl text-xl", icon === e ? "bg-primary/20 ring-2 ring-primary" : "glass")}>{e}</button>
              ))}
            </div>
          </Field>
          <PrimaryButton onClick={save}>Add Category</PrimaryButton>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
