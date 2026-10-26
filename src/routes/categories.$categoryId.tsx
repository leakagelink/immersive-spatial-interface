import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ProductDialog } from "@/components/app/forms";
import { ProductTable, useProductFilters } from "@/components/app/lists";
import { Cube3D, Empty, GhostButton, Page, PageHeader, PrimaryButton } from "@/components/app/ui3d";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/categories/$categoryId")({
  head: () => ({
    meta: [
      { title: "Category products — Rj Store" },
      { name: "description", content: "All products in this category with cost, GST, selling price and profit." },
      { property: "og:title", content: "Category products — Rj Store" },
      { property: "og:description", content: "Products in this category." },
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { categoryId } = Route.useParams();
  const nav = useNavigate();
  const { categories, products, updateCategory, deleteCategory } = useStore();
  const cat = categories.find((c) => c.id === categoryId);
  const list = products.filter((p) => p.categoryId === categoryId);
  const { filtered, controls } = useProductFilters(list);
  const [open, setOpen] = useState(false);
  if (!cat) return <Page><PageHeader title="Not found" back /><Empty title="This category doesn't exist" /></Page>;
  return (
    <Page>
      <PageHeader
        title={cat.name}
        subtitle={`${list.length} products`}
        back
        icon={<Cube3D hue={cat.hue} size={44}>{cat.icon}</Cube3D>}
        actions={
          <>
            <GhostButton className="h-11 w-11 px-0" aria-label="Rename" onClick={() => { const n = prompt("Category name", cat.name); if (n?.trim()) updateCategory(cat.id, { name: n.trim() }); }}><Pencil className="h-4 w-4" /></GhostButton>
            <GhostButton className="h-11 w-11 px-0 text-destructive" aria-label="Delete" onClick={() => { if (confirm(`Delete ${cat.name}? Products stay but become uncategorised.`)) { deleteCategory(cat.id); toast.success("Category deleted"); nav({ to: "/categories" }); } }}><Trash2 className="h-4 w-4" /></GhostButton>
          </>
        }
      />
      {controls}
      {filtered.length ? <ProductTable products={filtered} showVendor /> : <Empty title="No products here yet" />}
      <PrimaryButton className="mt-6 w-full" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Product</PrimaryButton>
      <ProductDialog open={open} onOpenChange={setOpen} />
    </Page>
  );
}
