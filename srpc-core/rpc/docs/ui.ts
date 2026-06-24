import type { MethodDoc } from "../../src/contract-docs.ts";
import { escapeHtml } from "./escape.ts";

export const cls = {
  panel: "mb-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm",
  h1: "flex items-center gap-2.5 text-3xl font-bold tracking-tight text-zinc-900",
  h1Icon: "text-brand",
  lead: "mt-3 max-w-3xl text-base leading-relaxed text-zinc-600",
  meta: "text-sm text-zinc-500",
  empty: "text-sm italic text-zinc-400",
  stats: "mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5",
  sectionTitle:
    "mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900",
  typeLink: "font-medium text-brand hover:text-brand-dark hover:underline",
  footer:
    "mt-10 flex items-center gap-2 border-t border-zinc-200 pt-6 text-sm text-zinc-400",
};

export function icon(name: string, className = ""): string {
  return `<i class="fa-solid fa-${name}${className ? ` ${className}` : ""}" aria-hidden="true"></i>`;
}

const HTTP_BADGE_COLORS: Record<string, string> = {
  GET: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  POST: "bg-blue-50 text-blue-700 ring-blue-600/20",
  PUT: "bg-amber-50 text-amber-700 ring-amber-600/20",
  PATCH: "bg-violet-50 text-violet-700 ring-violet-600/20",
  DELETE: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

export function httpBadge(method: string): string {
  const verb = method.toUpperCase();
  const color = HTTP_BADGE_COLORS[verb] ?? "bg-brand/10 text-brand ring-brand/20";
  return `<span class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${color}">${escapeHtml(verb)}</span>`;
}

export function methodChip(method: MethodDoc): string {
  const verb = method.httpMethod.toUpperCase();
  return `<span class="inline-flex items-center gap-1.5 rounded-md bg-zinc-50 px-2 py-1 text-sm text-zinc-700 ring-1 ring-inset ring-zinc-200"><span class="text-[0.6875rem] font-bold text-brand">${escapeHtml(verb)}</span>${escapeHtml(method.name)}</span>`;
}

export function statCard(
  iconName: string,
  value: number | string,
  label: string,
  _tone: string,
  labelHtml?: string
): string {
  return `<div class="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
    <div class="flex items-start justify-between gap-2">
      <span class="text-xs font-semibold uppercase tracking-wide text-zinc-400">${labelHtml ?? escapeHtml(label)}</span>
      <span class="text-zinc-400">${icon(iconName)}</span>
    </div>
    <p class="mt-2 text-2xl font-bold tracking-tight text-zinc-900">${value}</p>
  </div>`;
}

export function panelHeading(iconName: string, text: string): string {
  return `<h2 class="${cls.sectionTitle}">${icon(iconName, "text-brand")} ${text}</h2>`;
}

export function navLink(active: boolean): string {
  return active
    ? "flex items-center gap-2 rounded-lg bg-brand/10 px-2.5 py-1.5 text-sm font-medium text-brand"
    : "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-brand";
}

export function pkgNavLink(active: boolean): string {
  return active
    ? "flex items-center gap-2 rounded-lg bg-brand/10 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-brand"
    : "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-800 transition hover:bg-zinc-100 hover:text-brand";
}
