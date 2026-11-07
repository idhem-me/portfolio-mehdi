"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const items = [
  { id: "LOCAL-01", key: "paint", demo: "paint-color", addressed: true },
  { id: "LOCAL-02", key: "giftFields", demo: "native-controls" },
  { id: "LOCAL-03", key: "giftActions", demo: "button" },
  { id: "LOCAL-04", key: "sessions", demo: "table" },
  { id: "LOCAL-05", key: "colors", demo: "color-picker" },
  { id: "LOCAL-06", key: "caseStudies" },
  { id: "LOCAL-07", key: "settings", demo: "settings-modal" },
  { id: "LOCAL-09", key: "switchSlider", demo: "switch", addressed: true },
] as const;

export default function LocalComponentsPage() {
  const t = useTranslations("playground");
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
                  <Badge variant="outline">{t("addressed" in item ? "addressed" : "toReview")}</Badge>
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
