import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CreatorList } from "@/features/gift-lists/ui/creator";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Ma liste de cadeaux",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    notFound();
  return <CreatorList id={id} />;
}
export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-8">Chargement de la liste…</p>}>
      <Detail {...props} />
    </Suspense>
  );
}
