import Link from "next/link";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/paste-event", label: "Paste Event" },
  { href: "/performance", label: "Performance" },
  { href: "/admin/company-dictionary", label: "Dictionary" },
];

export function Nav() {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="font-semibold text-zinc-900 dark:text-zinc-50">
          Political Catalyst Radar
        </Link>
        <nav className="flex gap-4 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
