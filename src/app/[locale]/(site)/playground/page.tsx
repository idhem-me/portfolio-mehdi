import { PlaygroundCatalog } from "./catalog";
import { portfolioMetadata } from "@/lib/portfolio-seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/playground">) {
  const { locale } = await params;
  return portfolioMetadata("/playground", locale, { title: "Playground" });
}

export default function PlaygroundPage() {
  return <PlaygroundCatalog />;
}
