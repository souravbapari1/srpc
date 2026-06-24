import type { ContractDocsStore, ServiceDoc } from "../../src/contract-docs.ts";
import { escapeHtml } from "../escape.ts";
import { page } from "../layout.ts";
import { icon, panelHeading } from "../ui.ts";
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
    `<article class="panel panel-hero">
      <h1>${icon("plug", "title-icon")} ${escapeHtml(service.name)}</h1>
      <p class="lead">Service <code>${escapeHtml(service.qualifiedName)}</code> — ${service.methods.length} callable method${service.methods.length === 1 ? "" : "s"}.</p>
      ${hasStatus ? `<p class="meta">${icon("circle-check")} ${implemented} of ${service.methods.length} methods have handlers on this server.</p>` : ""}
    </article>
    <article class="panel">
      ${panelHeading("bolt", "Methods")}
      ${service.methods.map(method => renderMethodBlock(store, packageName, service, method)).join("")}
    </article>`,
    { store, activePackage: packageName, activeService: service.name }
  );
}
