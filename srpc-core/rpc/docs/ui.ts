import type { MethodDoc } from "../../src/contract-docs.ts";
import { escapeHtml } from "./escape.ts";

export const cls = {
  panel: "mb-6 rounded-xl bg-docs-panel p-6",
  panelAccent: "mb-6 rounded-xl bg-blue-500/10 p-6",
  panelMuted: "mb-6 rounded-xl bg-docs-sidebar p-6",
  card: "rounded-lg bg-white/5 p-4",
  h1: "flex items-center gap-2.5 text-3xl font-bold tracking-tight text-slate-50",
  h1Icon: "text-blue-400",
  lead: "mt-3 max-w-3xl text-base leading-relaxed text-slate-400",
  meta: "text-sm text-slate-500",
  empty: "text-sm italic text-slate-600",
  stats: "mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5",
  sectionTitle:
    "mb-4 flex items-center gap-2 text-lg font-semibold text-slate-100",
  typeLink: "font-medium text-blue-400 hover:text-blue-300 hover:underline",
  link: "font-medium text-blue-400 hover:text-blue-300",
  footer:
    "mt-10 flex items-center gap-2 pt-6 text-sm text-slate-500",
  code: "rounded bg-white/5 px-1.5 py-0.5 font-mono text-sm text-slate-200",
  codeXs: "rounded bg-white/5 px-1 py-0.5 font-mono text-xs text-slate-200",
  divider: "py-4",
  sectionGap: "mb-8 pb-8 last:mb-0 last:pb-0",
  tableHead:
    "text-xs font-semibold uppercase tracking-wide text-slate-500",
  tableRow: "py-3",
  label: "text-xs font-semibold uppercase tracking-wide text-slate-500",
  body: "text-sm text-slate-300",
  heading: "text-lg font-semibold text-slate-100",
  subheading: "text-base font-semibold text-slate-100",
  btn:
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark",
  btnSecondary:
    "inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-blue-400",
  listLink:
    "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-blue-400",
};

export function icon(name: string, className = ""): string {
  return `<i class="fa-solid fa-${name}${className ? ` ${className}` : ""}" aria-hidden="true"></i>`;
}

const HTTP_BADGE_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/15 text-emerald-400",
  POST: "bg-blue-500/15 text-blue-400",
  PUT: "bg-amber-500/15 text-amber-400",
  PATCH: "bg-violet-500/15 text-violet-400",
  DELETE: "bg-rose-500/15 text-rose-400",
};

export function httpBadge(method: string): string {
  const verb = method.toUpperCase();
  const color = HTTP_BADGE_COLORS[verb] ?? "bg-blue-500/15 text-blue-400";
  return `<span class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${color}">${escapeHtml(verb)}</span>`;
}

export function methodChip(method: MethodDoc): string {
  const verb = method.httpMethod.toUpperCase();
  const verbColor = HTTP_BADGE_COLORS[verb]?.split(" ").pop() ?? "text-blue-400";
  return `<span class="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-sm text-slate-300"><span class="text-[0.6875rem] font-bold ${verbColor}">${escapeHtml(verb)}</span>${escapeHtml(method.name)}</span>`;
}

export function statCard(
  iconName: string,
  value: number | string,
  label: string,
  _tone: string,
  labelHtml?: string
): string {
  return `<div class="rounded-lg bg-docs-sidebar p-4">
    <div class="flex items-start justify-between gap-2">
      <span class="${cls.label}">${labelHtml ?? escapeHtml(label)}</span>
      <span class="text-slate-600">${icon(iconName)}</span>
    </div>
    <p class="mt-2 text-2xl font-bold tracking-tight text-slate-50">${value}</p>
  </div>`;
}

export function panelHeading(iconName: string, text: string): string {
  return `<h2 class="${cls.sectionTitle}">${icon(iconName, "text-blue-400")} ${text}</h2>`;
}

export function navLink(active: boolean): string {
  return active
    ? "flex items-center gap-2 rounded-lg bg-blue-500/15 px-2.5 py-1.5 text-sm font-medium text-blue-400"
    : "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-blue-400";
}

export function pkgNavLink(active: boolean): string {
  return active
    ? "flex items-center gap-2 rounded-lg bg-blue-500/15 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-blue-400"
    : "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-300 transition hover:bg-white/5 hover:text-blue-400";
}

export function statusLive(): string {
  return `<span class="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">${icon("circle-check")} Live on this server</span>`;
}

export function statusPending(): string {
  return `<span class="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-0.5 text-xs font-semibold text-slate-500">${icon("circle-xmark")} Not wired up yet</span>`;
}
