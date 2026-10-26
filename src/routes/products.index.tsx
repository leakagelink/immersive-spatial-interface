import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { ProductDialog } from "@/components/app/forms";
import { ProductTable, useProductFilters } from "@/components/app/lists";
import { Empty, Page, PageHeader, PrimaryButton } from "@/components/app/ui3d";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/products/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "All Products — Rj Store" },
      { name: "description", content: "Search every product with cost, GST, selling price and profit." },
      { property: "og:title", content: "All Products — Rj Store" },
      { property: "og:description", content: "Search every product with prices and profit." },
    ],
  }),
  component: Products,
});

function Products() {
  const products = useStore((s) => s.products);
  const { filtered, controls } = useProductFilters(products);
  const [open, setOpen] = useState(false);
  return (
    <Page>
      <PageHeader title="Products" subtitle={`${products.length} products`} back actions={<PrimaryButton className="h-11 px-4" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /></PrimaryButton>} />
      {controls}
      {filtered.length ? <ProductTable products={filtered} showVendor /> : <Empty title="No products found" />}
      <ProductDialog open={open} onOpenChange={setOpen} />
    </Page>
  );
}
