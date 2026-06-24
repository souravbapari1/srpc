import type {
  ContractDocsStore,
  MethodDoc,
  ServiceDoc,
  ServiceListing,
} from "../../src/contract-docs.ts";
import { exampleRequest } from "../examples.ts";
import { escapeHtml } from "../escape.ts";
import { buildTypeLinkIndex, linkifyContractType } from "../type-links.ts";
import { httpBadge, icon, methodChip } from "../ui.ts";

export function renderServiceCard(packageName: string, service: ServiceDoc): string {
  const chips = service.methods.map(method => methodChip(method)).join("");

  const implemented = service.methods.filter(method => method.implemented).length;
  const status =
    service.methods.some(method => method.implemented !== undefined)
      ? `<p class="meta">${implemented} of ${service.methods.length} methods implemented on this server</p>`
      : "";

  return `<div class="service-card">
    <h4><span class="card-icon">${icon("plug")}</span> <a href="/docs/${escapeHtml(packageName)}/${escapeHtml(service.name)}">${escapeHtml(service.name)}</a></h4>
    <p class="qualified">${escapeHtml(service.qualifiedName)} · ${service.methods.length} method${service.methods.length === 1 ? "" : "s"}</p>
    <div class="method-chips">${chips}</div>
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
    return `<p class="empty">No services found in contracts.</p>`;
  }

  return [...byPackage.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([packageName, services]) => {
      const cards = services.map(service => renderServiceCard(packageName, service)).join("");
      return `<section class="pkg-section">
        <h3>${icon("box")} <a href="/docs/${escapeHtml(packageName)}">${escapeHtml(packageName)}</a> package</h3>
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
  const paramsText =
    method.params.length === 0
      ? "No parameters"
      : method.params
          .map(
            param =>
              `<code>${escapeHtml(param.name)}</code> (${linkifyContractType(param.type, typeIndex, contextPackage)})`
          )
          .join(", ");

  const handler =
    method.implemented === undefined
      ? ""
      : method.implemented
        ? `<span class="badge ok">${icon("circle-check")} Handler ready</span>`
        : `<span class="badge missing">${icon("circle-xmark")} Not implemented yet</span>`;

  return `<section class="method-block" id="${escapeHtml(method.name)}">
    <div class="method-head">
      <h3><span class="method-icon">${icon("bolt")}</span> ${escapeHtml(method.name)}</h3>
      ${httpBadge(method.httpMethod)}
      ${handler}
    </div>
    <p class="method-desc">${icon("terminal")} Call <code>${escapeHtml(service.qualifiedName)}.${escapeHtml(method.name)}</code> with the parameters below.</p>
    <dl class="detail-grid">
      <dt><span class="dt-icon in">${icon("arrow-right-to-bracket")}</span> Input</dt>
      <dd>${paramsText}</dd>
      <dt><span class="dt-icon out">${icon("arrow-right-from-bracket")}</span> Returns</dt>
      <dd>${linkifyContractType(method.returnType, typeIndex, contextPackage)}</dd>
    </dl>
    <p class="meta" style="margin-bottom:0.5rem">${icon("code")} Example request</p>
    <pre>${escapeHtml(exampleRequest(service.qualifiedName, method))}</pre>
  </section>`;
}
