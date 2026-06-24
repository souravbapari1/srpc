import type {
  ContractDocsStore,
  MethodDoc,
  ServiceDoc,
  ServiceListing,
} from "../../src/contract-docs.ts";
import { exampleRequest } from "../examples.ts";
import { codeBlock } from "../code-block.ts";
import { describeMethod, describeParams } from "../guide.ts";
import { escapeHtml } from "../escape.ts";
import { buildTypeLinkIndex, linkifyContractType } from "../type-links.ts";
import { cls, httpBadge, icon, methodChip } from "../ui.ts";

export function renderServiceCard(packageName: string, service: ServiceDoc): string {
  const chips = service.methods.map(method => methodChip(method)).join("");

  const implemented = service.methods.filter(method => method.implemented).length;
  const status =
    service.methods.some(method => method.implemented !== undefined)
      ? `<p class="${cls.meta} mt-2">${implemented} of ${service.methods.length} ready on this server</p>`
      : "";

  return `<div class="border-b border-zinc-100 py-4 last:border-0">
    <h4 class="flex items-center gap-2 text-base font-semibold text-zinc-900">
      <span class="text-zinc-400">${icon("plug")}</span>
      <a href="/docs/${escapeHtml(packageName)}/${escapeHtml(service.name)}" class="text-zinc-900 hover:text-brand">${escapeHtml(service.name)}</a>
    </h4>
    <p class="mt-1 text-sm text-zinc-600">${service.methods.length} API call${service.methods.length === 1 ? "" : "s"} available</p>
    <div class="mt-3 flex flex-wrap gap-1.5">${chips}</div>
    ${status}
  </div>`;
}

export function renderAllServices(store: ContractDocsStore): string {
  const byPackage = new Map<string, ServiceListing[]>();

  for (const service of store.getAllServices()) {
    const list = byPackage.get(service.package) ?? [];
    list.push(service);
    byPackage.set(service.package, list);
  }

  if (byPackage.size === 0) {
    return `<p class="${cls.empty}">No APIs found yet. Add services to your contract files to see them here.</p>`;
  }

  return [...byPackage.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([packageName, services]) => {
      const cards = services.map(service => renderServiceCard(packageName, service)).join("");
      return `<section class="mb-8 last:mb-0">
        <h3 class="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-zinc-500">${icon("box")} <a href="/docs/${escapeHtml(packageName)}" class="hover:text-brand">${escapeHtml(packageName)}</a></h3>
        <p class="mb-3 text-sm text-zinc-500">Related APIs grouped together</p>
        ${cards}
      </section>`;
    })
    .join("");
}

export function renderMethodBlock(
  store: ContractDocsStore,
  contextPackage: string,
  service: ServiceDoc,
  method: MethodDoc
): string {
  const typeIndex = buildTypeLinkIndex(store);
  const paramsDetail =
    method.params.length === 0
      ? ""
      : `<details class="mt-3 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">
          <summary class="cursor-pointer font-medium text-zinc-700">Show field types (advanced)</summary>
          <p class="mt-2">${method.params
            .map(
              param =>
                `<code class="rounded bg-white px-1 py-0.5 font-mono text-xs ring-1 ring-zinc-200">${escapeHtml(param.name)}</code> → ${linkifyContractType(param.type, typeIndex, contextPackage)}`
            )
            .join("<br />")}</p>
        </details>`;

  const handler =
    method.implemented === undefined
      ? ""
      : method.implemented
        ? `<span class="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">${icon("circle-check")} Live on this server</span>`
        : `<span class="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-500 ring-1 ring-inset ring-zinc-200">${icon("circle-xmark")} Not wired up yet</span>`;

  return `<section class="py-6 first:pt-0" id="${escapeHtml(method.name)}">
    <div class="flex flex-wrap items-center gap-2">
      <h3 class="flex items-center gap-2 text-lg font-semibold text-zinc-900"><span class="text-zinc-400">${icon("bolt")}</span> ${escapeHtml(method.name)}</h3>
      ${httpBadge(method.httpMethod)}
      ${handler}
    </div>
    <p class="mt-2 text-sm leading-relaxed text-zinc-700">${describeMethod(method.name)}</p>
    <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-[8.5rem_1fr]">
      <dt class="font-semibold text-zinc-500">What you send</dt>
      <dd class="text-zinc-800">${describeParams(method)}</dd>
      <dt class="font-semibold text-zinc-500">What you get</dt>
      <dd class="text-zinc-800">${linkifyContractType(method.returnType, typeIndex, contextPackage)}</dd>
    </dl>
    ${paramsDetail}
    <p class="${cls.meta} mb-3 mt-4">${icon("code")} Copy this request</p>
    ${codeBlock(exampleRequest(service.qualifiedName, method))}
  </section>`;
}
