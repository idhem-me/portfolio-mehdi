import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicGiftList } from "@/features/gift-lists/ui/public";
export const metadata: Metadata = {
  title: "Une liste de cadeaux à partager",
  robots: { index: false, follow: false, noarchive: true },
  referrer: "no-referrer",
};
async function Detail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-f0-9]{20}$/.test(slug)) notFound();
  return <PublicGiftList slug={slug} />;
}
export default function Page(props: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<p className="p-8">Ouverture de la liste…</p>}>
      <Detail {...props} />
    </Suspense>
  );
}
