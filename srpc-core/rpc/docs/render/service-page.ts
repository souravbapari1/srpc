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
      <p class="${cls.lead}">${service.methods.length} action${service.methods.length === 1 ? "" : "s"} you can call from the <code class="${cls.code}">${escapeHtml(packageName)}</code> package.</p>
      <p class="${cls.meta}">When sending requests, use <code class="${cls.codeXs}">${escapeHtml(service.qualifiedName)}</code> as the <code class="font-mono text-xs text-slate-300">service</code> field.</p>
      ${hasStatus ? `<p class="${cls.meta} mt-2">${icon("circle-check")} ${implemented} of ${service.methods.length} actions are live on this server.</p>` : ""}
      <p class="mt-4 text-sm"><a href="/playground?package=${escapeHtml(packageName)}&amp;service=${escapeHtml(service.name)}" class="${cls.link}">${icon("flask")} Try these in the Playground</a></p>
    </article>
    <article class="${cls.panel}">
      ${panelHeading("bolt", "Available actions")}
      <p class="${cls.meta} mb-4">Each section below explains one API call and includes a ready-to-send JSON example.</p>
      <div class="space-y-6">${service.methods.map(method => renderMethodBlock(store, packageName, service, method)).join("")}</div>
    </article>`,
    { store, activePackage: packageName, activeService: service.name }
  );
}
