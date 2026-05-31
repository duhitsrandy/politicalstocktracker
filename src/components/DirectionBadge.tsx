export function DirectionBadge({ direction }: { direction: string }) {
  const color =
    direction === "bullish"
      ? "text-emerald-700 dark:text-emerald-400"
      : direction === "bearish"
        ? "text-red-700 dark:text-red-400"
        : direction === "mixed"
          ? "text-amber-700 dark:text-amber-400"
          : "text-zinc-600 dark:text-zinc-400";

  return <span className={`text-xs font-medium uppercase ${color}`}>{direction}</span>;
}
