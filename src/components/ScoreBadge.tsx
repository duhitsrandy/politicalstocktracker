export function ScoreBadge({ score, level }: { score: number; level?: string }) {
  const color =
    score >= 86
      ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
      : score >= 71
        ? "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200"
        : score >= 51
          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

  return (
    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${color}`}>
      {score}
      {level ? ` · ${level}` : ""}
    </span>
  );
}
