import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EMOJIS, Field, PriceFields, VendorFields, emptyPrice, inputCls, validatePrice, type PriceDraft } from "@/components/app/forms";
import { GhostButton, Page, PageHeader, PrimaryButton, Tilt } from "@/components/app/ui3d";
import { uid, useStore, type VendorType } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vendors/new")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Add Vendor & Product — Rj Store" },
      { name: "description", content: "Add a new supplier and their products with prices in one step." },
      { property: "og:title", content: "Add Vendor & Product — Rj Store" },
      { property: "og:description", content: "Add a supplier and products in one step." },
    ],
  }),
  component: AddVendorProduct,
});

const blankVendor = () => ({ name: "", type: "GST" as VendorType, status: "active" as const, phone: "", gstin: "", address: "", notes: "" });

function AddVendorProduct() {
  const nav = useNavigate();
  const { vendors, categories, addVendor, addProduct } = useStore();
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [existingId, setExistingId] = useState(vendors[0]?.id ?? "");
  const [vf, setVf] = useState<ReturnType<typeof blankVendor> | Parameters<typeof VendorFields>[0]["f"]>(blankVendor());
  const [category, setCategory] = useState(categories[0]?.id ?? "");
  const [pname, setPname] = useState("");
  const [emoji, setEmoji] = useState("📦");
  const [stock, setStock] = useState("10");
  const [price, setPrice] = useState<PriceDraft>(emptyPrice());
  const [savedVendorId, setSavedVendorId] = useState<string | null>(null);

  const vType = mode === "existing" || savedVendorId ? vendors.find((v) => v.id === (savedVendorId ?? existingId))?.type : vf.type;

  const save = (another: boolean) => {
    let vid = savedVendorId ?? (mode === "existing" ? existingId : "");
    if (!vid) {
      if (!vf.name.trim()) { toast.error("Vendor name is required"); return; }
    }
    if (!pname.trim()) { toast.error("Product name is required"); return; }
    const pe = validatePrice(price);
    if (!pe) return;
    if (!vid) {
      vid = addVendor({ ...vf, name: vf.name.trim() }).id;
      setSavedVendorId(vid);
    }
    addProduct({ vendorId: vid, categoryId: category, name: pname.trim(), emoji, unit: "pcs", stock: Math.max(0, +stock || 0), lowStockAt: 5, history: [{ ...pe, id: uid() }] });
    toast.success(`${pname.trim()} saved`);
    if (another) {
      setPname(""); setEmoji("📦"); setPrice(emptyPrice()); setStock("10");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      nav({ to: "/vendors/$vendorId", params: { vendorId: vid } });
    }
  };

  const lockedVendor = savedVendorId ? vendors.find((v) => v.id === savedVendorId) : null;

  return (
    <Page>
      <PageHeader title="Add Vendor & Product" back />
      <Tilt className="p-5" max={3}>
        <h2 className="mb-4 font-display text-lg font-bold">Vendor Details</h2>
        {lockedVendor ? (
          <div className="rounded-2xl bg-primary/10 p-4 text-sm ring-1 ring-primary/30">Adding more products to <b>{lockedVendor.name}</b></div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-background/50 p-1">
              {(["new", "existing"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)} className={cn("h-10 rounded-xl text-sm font-bold transition", mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                  {m === "new" ? "New vendor" : "Existing vendor"}
                </button>
              ))}
            </div>
            {mode === "existing" ? (
              <Field label="Vendor" required>
                <select className={inputCls} value={existingId} onChange={(e) => setExistingId(e.target.value)}>
                  {vendors.map((v) => <option key={v.id} value={v.id} className="bg-popover">{v.name} ({v.type})</option>)}
                </select>
              </Field>
            ) : (
              <VendorFields f={vf} setF={setVf} />
            )}
          </>
        )}
        <Field label="Category" required className="mt-4" hint="Bakery, Juice, Chocolates, etc.">
          <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => <option key={c.id} value={c.id} className="bg-popover">{c.icon} {c.name}</option>)}
          </select>
        </Field>
      </Tilt>

      <Tilt className="mt-4 p-5" max={3} delay={80}>
        <h2 className="mb-4 font-display text-lg font-bold">Product Details</h2>
        <div className="space-y-4">
          <Field label="Product Name" required>
            <input className={inputCls} value={pname} onChange={(e) => setPname(e.target.value)} placeholder="e.g. Nutella Spread" />
          </Field>
          <Field label="Icon">
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS.slice(0, 16).map((e) => (
                <button key={e} onClick={() => setEmoji(e)} className={cn("grid h-10 w-10 place-items-center rounded-xl text-xl", emoji === e ? "bg-primary/20 ring-2 ring-primary" : "glass")}>{e}</button>
              ))}
            </div>
          </Field>
          <Field label="Opening stock">
            <input className={inputCls} type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
          </Field>
          <PriceFields d={price} set={setPrice} showCp={vType === "DM"} />
        </div>
      </Tilt>

      <div className="mt-6 space-y-3">
        <PrimaryButton className="w-full" onClick={() => save(false)}>Save Vendor & Product</PrimaryButton>
        <GhostButton className="w-full text-primary" onClick={() => save(true)}><Plus className="h-4 w-4" /> Save & Add Another Product</GhostButton>
      </div>
    </Page>
  );
}
