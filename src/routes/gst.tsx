import { createFileRoute } from "@tanstack/react-router";
import { VendorList } from "@/components/app/lists";
import { Page, PageHeader } from "@/components/app/ui3d";

export const Route = createFileRoute("/gst")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "GST Billed Suppliers — Rj Store" },
      { name: "description", content: "Suppliers that provide GST bills." },
      { property: "og:title", content: "GST Billed Suppliers — Rj Store" },
      { property: "og:description", content: "Suppliers that provide GST bills." },
    ],
  }),
  component: () => (
    <Page>
      <PageHeader title="GST Billed" subtitle="Suppliers providing GST bills" back />
      <VendorList type="GST" />
    </Page>
  ),
});
