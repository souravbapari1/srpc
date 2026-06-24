import type { ReactNode } from "react";

export function DocsPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="min-w-0 flex-1">
      <header className="mb-12 border-b border-border pb-8">
        <p className="section-label mb-3">Documentation</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-[0.9375rem] leading-7 text-muted-foreground">
          {description}
        </p>
      </header>
      <div className="docs-content flex flex-col gap-10 text-foreground/90">
        {children}
      </div>
    </article>
  );
}

export function DocsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="scroll-mt-24 border-t border-border pt-8 first:border-t-0 first:pt-0">
      <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="flex flex-col gap-4 text-sm leading-7">{children}</div>
    </section>
  );
}

export function DocsList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map(item => (
        <li
          key={item}
          className="flex gap-3 text-muted-foreground before:mt-2 before:h-1.5 before:w-1.5 before:shrink-0 before:bg-accent"
        >
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
