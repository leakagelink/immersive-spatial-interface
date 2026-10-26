import { Link } from "@tanstack/react-router";
import { ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { currentPrice, profitOf, stockState, useStore, type Product, type VendorType } from "@/lib/store";
import { Avatar3D, Chip, Empty, FilterPills, PrimaryButton, SearchBox, SortSelect, StatusBadge } from "./ui3d";
import { VendorDialog } from "./forms";

export function ProductTable({ products, showCp, showVendor }: { products: Product[]; showCp?: boolean | undefined; showVendor?: boolean }) {
  const vendors = useStore((s) => s.vendors);
  const cols = showCp ? "grid-cols-[minmax(10rem,1.6fr)_repeat(5,4.2rem)_1.5rem]" : "grid-cols-[minmax(10rem,1.6fr)_repeat(4,4.2rem)_1.5rem]";
  return (
    <>
    <div className="space-y-2 sm:hidden">
      {products.map((p, i) => {
        const c = currentPrice(p);
        const pr = profitOf(c);
        const st = stockState(p);
        const cells: [string, React.ReactNode][] = [
          ["Cost", <Chip key="c" kind="cost" value={c.cost} className="w-full min-w-0" />],
          ["GST", <Chip key="g" kind="gst" value={c.gst} pct className="w-full min-w-0" />],
          ["SP", <Chip key="s" kind="sp" value={c.sp} className="w-full min-w-0" />],
          ...(showCp ? [["CP", <Chip key="cp" kind="cp" value={c.cp ?? c.cost} className="w-full min-w-0" />] as [string, React.ReactNode]] : []),
          ["Profit", <Chip key="p" kind={pr >= 0 ? "profit" : "loss"} value={pr} className="w-full min-w-0" />],
        ];
        return (
          <Link key={p.id} to="/products/$productId" params={{ productId: p.id }} className="glass animate-rise block rounded-2xl p-3 active:scale-[.99]" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-2xl shadow-3d">{p.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{p.name}</span>
                <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", st === "in" ? "bg-sp" : st === "low" ? "bg-cp" : "bg-destructive")} />
                  <span className="shrink-0">{st === "out" ? "Out of stock" : `${p.stock} ${p.unit}`}</span>
                  {showVendor && <span className="truncate">· {vendors.find((v) => v.id === p.vendorId)?.name}</span>}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
            <div className={cn("mt-3 grid gap-1.5", showCp ? "grid-cols-5" : "grid-cols-4")}>
              {cells.map(([l, el]) => (
                <div key={l} className="min-w-0 text-center">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{l}</div>
                  {el}
                </div>
              ))}
            </div>
          </Link>
        );
      })}
    </div>
    <div className="-mx-4 hidden overflow-x-auto px-4 pb-2 sm:block">
      <div className={cn("min-w-max", "space-y-2")}>
        <div className={cn("grid items-center gap-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground", cols)}>
          <span>Product</span><span className="text-center">Cost ₹</span><span className="text-center">GST</span><span className="text-center">SP ₹</span>
          {showCp && <span className="text-center">CP ₹</span>}<span className="text-center">Profit ₹</span><span />
        </div>
        {products.map((p, i) => {
          const c = currentPrice(p);
          const pr = profitOf(c);
          const st = stockState(p);
          return (
            <Link
              key={p.id}
              to="/products/$productId"
              params={{ productId: p.id }}
              className={cn("glass animate-rise grid items-center gap-2 rounded-2xl p-2 pr-3 transition hover:-translate-y-0.5 hover:[transform:perspective(800px)_rotateX(4deg)]", cols)}
              style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-2xl shadow-3d">{p.emoji}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{p.name}</span>
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className={cn("h-1.5 w-1.5 rounded-full", st === "in" ? "bg-sp" : st === "low" ? "bg-cp" : "bg-destructive")} />
                    {st === "out" ? "Out of stock" : `${p.stock} ${p.unit}`}
                    {showVendor && <span className="truncate">· {vendors.find((v) => v.id === p.vendorId)?.name}</span>}
                  </span>
                </span>
              </span>
              <Chip kind="cost" value={c.cost} />
              <Chip kind="gst" value={c.gst} pct />
              <Chip kind="sp" value={c.sp} />
              {showCp && <Chip kind="cp" value={c.cp ?? c.cost} />}
              <Chip kind={pr >= 0 ? "profit" : "loss"} value={pr} />
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </div>
    </>
  );
}

type PSort = "name" | "profit" | "sp" | "recent";
export function useProductFilters(list: Product[]) {
  const [q, setQ] = useState("");
  const [stock, setStock] = useState<"all" | "in" | "low" | "out">("all");
  const [sort, setSort] = useState<PSort>("name");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return list
      .filter((p) => !t || p.name.toLowerCase().includes(t))
      .filter((p) => stock === "all" || stockState(p) === stock)
      .sort((a, b) => {
        if (sort === "profit") return profitOf(currentPrice(b)) - profitOf(currentPrice(a));
        if (sort === "sp") return currentPrice(b).sp - currentPrice(a).sp;
        if (sort === "recent") return currentPrice(b).date.localeCompare(currentPrice(a).date);
        return a.name.localeCompare(b.name);
      });
  }, [list, q, stock, sort]);
  const controls = (
    <div className="mb-4 space-y-3">
      <SearchBox value={q} onChange={setQ} placeholder="Search products…" />
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <FilterPills
            value={stock}
            onChange={setStock}
            options={[
              { value: "all", label: "All", count: list.length },
              { value: "in", label: "In Stock" },
              { value: "low", label: "Low Stock" },
              { value: "out", label: "Out of Stock" },
            ]}
          />
        </div>
        <SortSelect value={sort} onChange={setSort} options={[{ value: "name", label: "Name" }, { value: "profit", label: "Profit" }, { value: "sp", label: "Price" }, { value: "recent", label: "Recent" }]} />
      </div>
    </div>
  );
  return { filtered, controls };
}

export function VendorList({ type }: { type?: VendorType }) {
  const { vendors, products } = useStore();
  const [q, setQ] = useState("");
  const [st, setSt] = useState<"all" | "active" | "inactive">("all");
  const [sort, setSort] = useState<"name" | "items" | "recent">("name");
  const [open, setOpen] = useState(false);
  const base = vendors.filter((v) => !type || v.type === type);
  const list = base
    .filter((v) => (st === "all" ? true : v.status === st))
    .filter((v) => v.name.toLowerCase().includes(q.trim().toLowerCase()))
    .map((v) => ({ v, n: products.filter((p) => p.vendorId === v.id).length }))
    .sort((a, b) => (sort === "items" ? b.n - a.n : sort === "recent" ? b.v.createdAt.localeCompare(a.v.createdAt) : a.v.name.localeCompare(b.v.name)));
  return (
    <>
      <div className="mb-4 flex gap-2">
        <SearchBox value={q} onChange={setQ} placeholder={`Search ${type === "URD" ? "URD dealers" : "vendors"}…`} />
        <PrimaryButton onClick={() => setOpen(true)} className="shrink-0 px-4">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add {type === "URD" ? "URD" : "Vendor"}</span>
        </PrimaryButton>
      </div>
      <div className="mb-4 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <FilterPills value={st} onChange={setSt} options={[{ value: "all", label: "All", count: base.length }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
        </div>
        <SortSelect value={sort} onChange={setSort} options={[{ value: "name", label: "Name" }, { value: "items", label: "Items" }, { value: "recent", label: "Newest" }]} />
      </div>
      {list.length === 0 ? (
        <Empty title="No vendors found" hint="Try another search or add a new vendor." />
      ) : (
        <div className="space-y-2.5">
          {list.map(({ v, n }, i) => (
            <Link
              key={v.id}
              to="/vendors/$vendorId"
              params={{ vendorId: v.id }}
              className="glass animate-rise flex items-center gap-3 rounded-2xl p-3 transition hover:-translate-y-0.5"
              style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
            >
              <Avatar3D name={v.name} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{v.name}</div>
                <div className="text-xs text-muted-foreground">{n} items · {v.type === "GST" ? "GST Billed" : v.type}</div>
              </div>
              <StatusBadge status={v.status} />
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
      <VendorDialog open={open} onOpenChange={setOpen} defaultType={type ?? "GST"} />
    </>
  );
}
