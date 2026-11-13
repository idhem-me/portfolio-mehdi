import { PageBreadcrumb } from "@/components/layout/page-breadcrumb";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pendingLocalComponents, showLocalComponents } from "@/lib/playground-access";

export const metadata = { robots: { index: false, follow: false } };

export default async function LocalComponentsPage({ params }: PageProps<"/[locale]/playground/local-components">) {
  if (!showLocalComponents) notFound();

  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "playground" });
  return (
    <section className="mx-auto w-full max-w-3xl space-y-6 px-6 py-12">
      <PageBreadcrumb
        current={t("localTitle")}
        parents={[{ href: "/playground", label: t("title") }]}
      />
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("localTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("localIntro")}</p>
      </header>
      <ul className="space-y-3">
        {pendingLocalComponents.map((item) => (
          <li key={item.id} id={item.id}>
            <Card size="sm">
              <CardHeader>
                <span className="font-mono text-xs text-muted-foreground">{item.id}</span>
                <CardTitle>{t(item.key)}</CardTitle>
              </CardHeader>
              {item.demo && (
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
