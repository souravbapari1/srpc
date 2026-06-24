"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { docNav } from "@/lib/docs-nav";

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 lg:sticky lg:top-20 lg:w-52 lg:self-start lg:border-r lg:border-border lg:pr-8">
      <p className="section-label mb-5">Guide</p>
      <nav className="flex flex-col gap-0.5">
        {docNav.map(item => {
          const active =
            item.href === "/docs"
              ? pathname === "/docs"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative py-2 pl-3 pr-2 text-sm transition ${
                active
                  ? "nav-active text-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
