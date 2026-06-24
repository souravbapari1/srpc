import Link from "next/link";
import type { ReactNode } from "react";

export function FeatureRow({
  label,
  title,
  description,
  bullets,
  link,
  linkLabel,
  children,
  reverse = false,
}: {
  label: string;
  title: string;
  description?: string;
  bullets?: string[];
  link?: string;
  linkLabel?: string;
  children: ReactNode;
  reverse?: boolean;
}) {
  return (
    <div
      className={`feature-row grid items-center gap-12 lg:gap-16 ${
        reverse ? "lg:grid-cols-[1.1fr_1fr]" : "lg:grid-cols-[1fr_1.1fr]"
      }`}
    >
      <div className={reverse ? "lg:order-2" : ""}>
        <p className="feature-label">{label}</p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h3>
        {description ? (
          <p className="mt-4 text-base leading-7 text-muted-foreground">{description}</p>
        ) : null}
        {bullets ? (
          <ul className="mt-6 space-y-3">
            {bullets.map(item => (
              <li
                key={item}
                className="flex gap-3 text-sm leading-6 text-muted-foreground before:mt-2 before:h-1.5 before:w-1.5 before:shrink-0 before:bg-accent"
              >
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {link && linkLabel ? (
          <Link
            href={link}
            className="link-arrow mt-8"
            {...(link.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {linkLabel}
          </Link>
        ) : null}
      </div>
      <div className={`code-frame ${reverse ? "lg:order-1" : ""}`}>{children}</div>
    </div>
  );
}
