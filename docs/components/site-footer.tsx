import Link from "next/link";
import { Logo } from "./logo";
import { docNav } from "@/lib/docs-nav";

export function SiteFooter({ minimal = false }: { minimal?: boolean }) {
  if (minimal) {
    return (
      <footer className="site-footer-minimal">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-8 sm:flex-row sm:items-center">
          <Logo />
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {docNav.slice(1, 5).map(item => (
              <Link key={item.href} href={item.href} className="transition hover:text-foreground">
                {item.title}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    );
  }

  const learn = docNav.slice(0, 4);
  const build = docNav.slice(4);

  return (
    <footer className="mt-auto">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-6 text-muted">
              RPC framework for agentic development — write contracts, generate
              types, and expose services agents can call over HTTP.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-2">
            <div>
              <p className="section-label mb-3">Contracts</p>
              <div className="flex flex-col gap-2 text-muted-foreground">
                {learn.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="transition hover:text-foreground"
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="section-label mb-3">Runtime</p>
              <div className="flex flex-col gap-2 text-muted-foreground">
                {build.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="transition hover:text-foreground"
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
        <p className="mt-10 text-xs text-muted">
          SRPC — RPC framework for agentic development
        </p>
      </div>
    </footer>
  );
}
