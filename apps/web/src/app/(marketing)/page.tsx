import type { Metadata } from "next";
import { ContentPage } from "@/components/content/content-page";
import { getResolvedHomepage } from "@/lib/content";

export const metadata: Metadata = {
  title: "Portfolio website design",
  description:
    "Shapewebs creates client-facing portfolio and business websites designed to build trust and open conversations.",
};

export default async function MarketingHomePage() {
  const document = await getResolvedHomepage();

  if (!document) {
    return null;
  }

  return <ContentPage document={document} />;
}
