import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <main
      aria-busy="true"
      className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 sm:py-12"
    >
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-60 w-full" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 xl:grid-cols-10">
        {Array.from({ length: 20 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </main>
  );
}
