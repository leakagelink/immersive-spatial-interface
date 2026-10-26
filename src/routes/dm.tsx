import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { ProductDialog } from "@/components/app/forms";
import { ProductTable, useProductFilters } from "@/components/app/lists";
import { Empty, Page, PageHeader, PrimaryButton } from "@/components/app/ui3d";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/dm")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "DM Purchases — Rj Store" },
      { name: "description", content: "Your discounted-product purchases with cost, CP, SP and profit." },
      { property: "og:title", content: "DM Purchases — Rj Store" },
      { property: "og:description", content: "Your discounted-product purchases." },
    ],
  }),
  component: DM,
});

function DM() {
  const { vendors, products } = useStore();
  const dmIds = new Set(vendors.filter((v) => v.type === "DM").map((v) => v.id));
  const list = products.filter((p) => dmIds.has(p.vendorId));
  const { filtered, controls } = useProductFilters(list);
  const [open, setOpen] = useState(false);
  const firstDm = vendors.find((v) => v.type === "DM")?.id;
  return (
    <Page>
      <PageHeader title="DM" subtitle="Discounted-product purchases" back actions={<PrimaryButton className="h-11 px-4" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /><span className="hidden sm:inline">Add Product</span></PrimaryButton>} />
      {controls}
      {filtered.length ? <ProductTable products={filtered} showCp /> : <Empty title="No DM products" hint="Add a DM vendor first, then add products." />}
      <ProductDialog open={open} onOpenChange={setOpen} vendorId={firstDm} />
    </Page>
  );
}
