import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MapPin, Pencil, Phone, Plus, Receipt, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ProductDialog, VendorDialog } from "@/components/app/forms";
import { ProductTable, useProductFilters } from "@/components/app/lists";
import { Avatar3D, Empty, GhostButton, Page, PageHeader, PrimaryButton, StatusBadge, Tilt } from "@/components/app/ui3d";
import { currentPrice, fmt, fmtDate, profitOf, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vendors/$vendorId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Vendor — Rj Store" },
      { name: "description", content: "Products, prices and contact details for this supplier." },
      { property: "og:title", content: "Vendor — Rj Store" },
      { property: "og:description", content: "Products and details for this supplier." },
    ],
  }),
  component: VendorPage,
});

function VendorPage() {
  const { vendorId } = Route.useParams();
  const nav = useNavigate();
  const { vendors, products, deleteVendor } = useStore();
  const v = vendors.find((x) => x.id === vendorId);
  const list = products.filter((p) => p.vendorId === vendorId);
  const { filtered, controls } = useProductFilters(list);
  const [tab, setTab] = useState<"products" | "details">("products");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  if (!v) return <Page><PageHeader title="Not found" back /><Empty title="This vendor doesn't exist" /></Page>;
  const typeLabel = v.type === "GST" ? "GST Billed" : v.type === "URD" ? "Unregistered Dealer" : "DM Purchases";
  const totalProfit = list.reduce((a, p) => a + profitOf(currentPrice(p)), 0);

  return (
    <Page>
      <PageHeader
        title={v.name}
        subtitle={typeLabel}
        back
        icon={<Avatar3D name={v.name} />}
        actions={<GhostButton className="h-11 w-11 px-0" aria-label="Edit vendor" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /></GhostButton>}
      />
      <div className="glass mb-5 grid grid-cols-2 gap-1 rounded-2xl p-1">
        {(["products", "details"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("h-11 rounded-xl text-sm font-bold transition", tab === t ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground")}>
            {t === "products" ? `Products (${list.length})` : "Vendor Details"}
          </button>
        ))}
      </div>

      {tab === "products" ? (
        <>
          {controls}
          {filtered.length ? <ProductTable products={filtered} showCp={v.type === "DM"} /> : <Empty title="No products yet" hint="Add this vendor's first product." />}
          <PrimaryButton className="mt-6 w-full" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add Product</PrimaryButton>
        </>
      ) : (
        <div className="space-y-4">
          <Tilt className="p-5" max={4}>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">{typeLabel}</span>
              <StatusBadge status={v.status} />
            </div>
            <dl className="mt-5 space-y-4 text-sm">
              <Row icon={<Phone className="h-4 w-4" />} label="Phone">{v.phone ? <a className="text-primary" href={`tel:${v.phone.replace(/\s/g, "")}`}>{v.phone}</a> : "—"}</Row>
              {v.type === "GST" && <Row icon={<Receipt className="h-4 w-4" />} label="GSTIN">{v.gstin || "—"}</Row>}
              <Row icon={<MapPin className="h-4 w-4" />} label="Address">{v.address || "—"}</Row>
            </dl>
            {v.notes && <p className="mt-4 rounded-2xl bg-background/50 p-3 text-sm text-muted-foreground">{v.notes}</p>}
          </Tilt>
          <div className="grid grid-cols-3 gap-3">
            {[{ l: "Products", v: list.length }, { l: "Total profit/unit", v: `₹${fmt(totalProfit)}` }, { l: "Since", v: fmtDate(v.createdAt) }].map((s) => (
              <div key={s.l} className="glass rounded-2xl p-3">
                <div className="font-display text-base font-bold">{s.v}</div>
                <div className="text-xs text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
          <GhostButton
            className="w-full text-destructive"
            onClick={() => {
              if (confirm(`Delete ${v.name} and all ${list.length} of its products?`)) {
                deleteVendor(v.id);
                toast.success("Vendor deleted");
                nav({ to: "/vendors" });
              }
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete Vendor
          </GhostButton>
        </div>
      )}
      <ProductDialog open={addOpen} onOpenChange={setAddOpen} vendorId={v.id} />
      <VendorDialog open={editOpen} onOpenChange={setEditOpen} vendor={v} />
    </Page>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">{icon}</span>
      <div>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="font-semibold">{children}</dd>
      </div>
    </div>
  );
}
