import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showLocalComponents } from "@/lib/playground-access";
import { demoAnchors } from "../coverage";

export const metadata = { robots: { index: false, follow: false } };

const items = [
  { id: "LOCAL-01", key: "paint", demo: demoAnchors.PaintColor, addressed: true },
  { id: "LOCAL-02", key: "giftFields", demo: demoAnchors.Textarea, addressed: true },
  { id: "LOCAL-03", key: "giftActions", demo: demoAnchors.GiftActions, addressed: true },
  { id: "LOCAL-04", key: "sessions", demo: demoAnchors.Table, addressed: true },
  { id: "LOCAL-05", key: "colors", demo: demoAnchors.Swatches, addressed: true },
  { id: "LOCAL-06", key: "caseStudies", demo: demoAnchors.CaseStudy, addressed: true },
  { id: "LOCAL-07", key: "settings", demo: demoAnchors.SettingsModal, addressed: true },
  { id: "LOCAL-09", key: "switchSlider", demo: demoAnchors.Switch, addressed: true },
] as const;

export default async function LocalComponentsPage({ params }: PageProps<"/[locale]/playground/local-components">) {
  if (!showLocalComponents) notFound();

  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "playground" });
  return (
    <section className="mx-auto w-full max-w-3xl space-y-6 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("localTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("localIntro")}</p>
      </header>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} id={item.id}>
            <Card size="sm">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{item.id}</span>
                  <Badge variant="outline">{t(item.addressed ? "addressed" : "toReview")}</Badge>
                </div>
                <CardTitle>{t(item.key)}</CardTitle>
              </CardHeader>
              {"demo" in item && (
                <CardContent>
                  <Link className="inline-flex min-h-(--control-height) items-center underline underline-offset-4" href={`/playground#${item.demo}`}>{t("seeDemo")}</Link>
                </CardContent>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
