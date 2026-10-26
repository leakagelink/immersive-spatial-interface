import { createFileRoute } from "@tanstack/react-router";
import { VendorList } from "@/components/app/lists";
import { Page, PageHeader } from "@/components/app/ui3d";

export const Route = createFileRoute("/vendors/")({
  head: () => ({
    meta: [
      { title: "Vendors — Rj Store" },
      { name: "description", content: "All your suppliers in one place — GST billed, URD and DM." },
      { property: "og:title", content: "Vendors — Rj Store" },
      { property: "og:description", content: "All your suppliers in one place." },
    ],
  }),
  component: () => (
    <Page>
      <PageHeader title="Vendors" subtitle="Find products by vendor" back />
      <VendorList />
    </Page>
  ),
});
