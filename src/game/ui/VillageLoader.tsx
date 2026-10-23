export function VillageLoader() {
  return (
    <div
      className="flex h-dvh w-full items-center justify-center"
      style={{
        background: "linear-gradient(180deg, #BFE3F0 0%, #E9F6FA 100%)",
      }}
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-medium text-stone-700">Chargement du village…</p>
    </div>
  );
}
