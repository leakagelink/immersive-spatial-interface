import { createFileRoute } from "@tanstack/react-router";
import { VendorList } from "@/components/app/lists";
import { Page, PageHeader } from "@/components/app/ui3d";

export const Route = createFileRoute("/urd")({
  head: () => ({
    meta: [
      { title: "URD Dealers — Rj Store" },
      { name: "description", content: "Unregistered dealers you buy from." },
      { property: "og:title", content: "URD Dealers — Rj Store" },
      { property: "og:description", content: "Unregistered dealers you buy from." },
    ],
  }),
  component: () => (
    <Page>
      <PageHeader title="URD" subtitle="Unregistered dealers" back />
      <VendorList type="URD" />
    </Page>
  ),
});
