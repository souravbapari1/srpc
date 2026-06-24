import type { ContractDocsStore, ServiceDoc } from "../../src/contract-docs.ts";
import { escapeHtml } from "../escape.ts";
import { page } from "../layout.ts";
import { cls, icon, panelHeading } from "../ui.ts";
import { renderMethodBlock } from "./services.ts";

export function renderServiceDocs(
  store: ContractDocsStore,
  packageName: string,
  service: ServiceDoc
): string {
  const implemented = service.methods.filter(method => method.implemented).length;
  const hasStatus = service.methods.some(method => method.implemented !== undefined);

  return page(
    service.name,
    `<article class="${cls.panel}">
      <h1 class="${cls.h1}">${icon("plug", cls.h1Icon)} ${escapeHtml(service.name)}</h1>
      <p class="${cls.lead}">Service <code class="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm">${escapeHtml(service.qualifiedName)}</code> — ${service.methods.length} callable method${service.methods.length === 1 ? "" : "s"}.</p>
      ${hasStatus ? `<p class="${cls.meta}">${icon("circle-check")} ${implemented} of ${service.methods.length} methods have handlers on this server.</p>` : ""}
    </article>
    <article class="${cls.panel}">
      ${panelHeading("bolt", "Methods")}
      <div class="divide-y divide-zinc-100">${service.methods.map(method => renderMethodBlock(store, packageName, service, method)).join("")}</div>
    </article>`,
    { store, activePackage: packageName, activeService: service.name }
  );
}
