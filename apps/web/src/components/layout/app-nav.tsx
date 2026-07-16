"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/applications", label: "Applications" },
  { href: "/reports", label: "Daily Reports" },
  { href: "/settings", label: "Settings" },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-5 flex flex-wrap gap-1 text-sm">
      {nav.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-1.5 transition-colors duration-200",
              active
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
