import Link from "next/link";
import { Logo } from "./logo";

const navLinks = [
  { href: "/docs/contracts", label: "Contracts" },
  { href: "/docs/types", label: "Types" },
  { href: "/docs/services", label: "Services" },
  { href: "/docs/handlers", label: "Handlers" },
];

export function SiteHeader() {
  return (
    <header className="site-header sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />
        <nav className="flex items-center gap-1 text-sm">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="hidden px-3 py-2 text-muted-foreground transition hover:text-foreground md:inline"
            >
              {link.label}
            </Link>
          ))}
          <Link href="/docs" className="btn-primary ml-2 px-4 py-2 text-sm font-medium">
            Docs
          </Link>
        </nav>
      </div>
    </header>
  );
}
