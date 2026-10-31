import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
async function Alias({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!/^[a-f0-9]{20}$/.test(slug)) notFound();
  return redirect(`${locale === "fr" ? "" : `/${locale}`}/l/${slug}`);
}
export default function Page(props: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <Alias {...props} />
    </Suspense>
  );
}
