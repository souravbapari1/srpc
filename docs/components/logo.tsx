import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-2.5 ${className}`}
    >
      <span className="flex h-7 w-7 items-center justify-center bg-accent text-[10px] font-bold text-white">
        S
      </span>
      <span className="text-[0.9375rem] font-semibold tracking-tight text-foreground transition group-hover:text-accent">
        SRPC
      </span>
    </Link>
  );
}
