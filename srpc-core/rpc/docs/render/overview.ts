import type { ContractDocsStore } from "../../src/contract-docs.ts";
import { escapeHtml } from "../escape.ts";
import { page } from "../layout.ts";
import { codeBlock } from "../code-block.ts";
import { cls, httpBadge, icon, panelHeading, statCard } from "../ui.ts";
import { renderAllServices } from "./services.ts";

export function renderDocsIndex(store: ContractDocsStore): string {
  const { index } = store;

  return page(
    "API Overview",
    `<article class="${cls.panel}">
      <h1 class="${cls.h1}">${icon("book-open", cls.h1Icon)} API Documentation</h1>
      <p class="${cls.lead}">
        Every service and method below comes from your <code class="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm text-zinc-800">.ctr</code> contract files.
        Call any method through a single HTTP endpoint — <code class="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm text-zinc-800">POST /srpc</code> — with a typed JSON envelope.
      </p>
      <div class="${cls.stats}">
        ${statCard("server", index.totalServices, "services", "services")}
        ${statCard("bolt", index.totalMethods, "methods", "methods")}
        ${statCard("boxes-stacked", index.packages.length, "packages", "packages", `<a href="/docs/visualizer" class="text-inherit hover:text-brand">packages</a>`)}
        ${statCard("table-cells", index.totalStructs, "data types", "structs", `<a href="/docs/types" class="text-inherit hover:text-brand">data types</a>`)}
        ${statCard("list-ul", index.totalEnums, "enums", "enums")}
      </div>
    </article>
    <article class="${cls.panel} bg-zinc-50">
      ${panelHeading("circle-play", "How to call a method")}
      <p class="${cls.meta} mb-4">Send a POST request to <code class="rounded bg-white px-1.5 py-0.5 font-mono text-sm ring-1 ring-zinc-200">/srpc</code> with this JSON body. Replace <code class="rounded bg-white px-1.5 py-0.5 font-mono text-sm ring-1 ring-zinc-200">service</code>, <code class="rounded bg-white px-1.5 py-0.5 font-mono text-sm ring-1 ring-zinc-200">method</code>, and <code class="rounded bg-white px-1.5 py-0.5 font-mono text-sm ring-1 ring-zinc-200">params</code> with values from any method below.</p>
      ${codeBlock(`{
  "srpc": "1.0",
  "service": "user.UserService",
  "method": "getUser",
  "params": {
    "id": "user-1"
  }
}`)}
      <p class="${cls.meta} mt-4">Methods marked ${httpBadge("GET")} can also be called via <code class="rounded bg-white px-1.5 py-0.5 font-mono text-sm ring-1 ring-zinc-200">GET /srpc?service=...&amp;method=...&amp;params=...</code></p>
    </article>
    <article class="${cls.panel}">
      ${panelHeading("layer-group", "All services")}
      <p class="${cls.meta} mb-4">Browse every callable service grouped by contract package.</p>
      ${renderAllServices(store)}
    </article>`,
    { store }
  );
}

export function renderDocsNotFound(
  store: ContractDocsStore,
  kind: string,
  name: string
): string {
  return page(
    "Not found",
    `<article class="${cls.panel}">
      <h1 class="${cls.h1}">${icon("triangle-exclamation", "text-amber-500")} Page not found</h1>
      <p class="${cls.lead}">There is no ${escapeHtml(kind)} named <code class="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm">${escapeHtml(name)}</code> in your contracts.</p>
      <p class="${cls.meta}">${icon("house")} <a href="/docs" class="text-brand hover:text-brand-dark">Back to overview</a></p>
    </article>`,
    { store }
  );
}
