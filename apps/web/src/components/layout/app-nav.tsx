"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  FileText,
  LayoutList,
  Settings,
  SunMedium,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Briefing", icon: SunMedium, index: "01" },
  { href: "/opportunities", label: "Opportunities", icon: LayoutList, index: "02" },
  { href: "/applications", label: "Applications", icon: BriefcaseBusiness, index: "03" },
  { href: "/reports", label: "Reports", icon: FileText, index: "04" },
  { href: "/settings", label: "Settings", icon: Settings, index: "05" },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary navigation" className="flex overflow-x-auto px-3 py-2 md:block md:px-4 md:py-6">
      {nav.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] md:gap-3 md:border-b-0 md:border-l-2 md:px-4 md:py-3",
              active
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]"
                : "border-transparent text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--ink)]",
            )}
          >
            <Icon className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.7} aria-hidden />
            <span>{item.label}</span>
            <span className="ml-auto hidden font-mono text-[0.65rem] font-normal text-[var(--muted)] md:block">
              {item.index}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
