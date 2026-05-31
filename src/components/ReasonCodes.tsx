export function ReasonCodes({ codes }: { codes: string[] }) {
  if (!codes.length) return null;
  return (
    <ul className="flex flex-wrap gap-1">
      {codes.map((c) => (
        <li
          key={c}
          className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        >
          {c}
        </li>
      ))}
    </ul>
  );
}
