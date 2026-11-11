import { portfolioMetadata } from "@/lib/portfolio-seo";

export async function generateMetadata({ params }: LayoutProps<"/[locale]/playground/design-systems">) {
  const { locale } = await params;
  return portfolioMetadata("/playground/design-systems", locale, { title: "Playground" });
}

export default function DesignSystemsLayout({ children }: LayoutProps<"/[locale]/playground/design-systems">) {
  return children;
}
