import type { ContractDocsStore } from "../../src/contract-docs.ts";
import { escapeHtml } from "../escape.ts";
import { page } from "../layout.ts";
import { httpBadge, icon, panelHeading, statCard } from "../ui.ts";
import { renderAllServices } from "./services.ts";

export function renderDocsIndex(store: ContractDocsStore): string {
  const { index } = store;

  return page(
    "API Overview",
    `<article class="panel panel-hero">
      <h1>${icon("book-open", "title-icon")} API Documentation</h1>
      <p class="lead">
        Every service and method below comes from your <code>.ctr</code> contract files.
        Call any method through a single HTTP endpoint — <code>POST /srpc</code> — with a typed JSON envelope.
      </p>
      <div class="stats">
        ${statCard("server", index.totalServices, "services", "services")}
        ${statCard("bolt", index.totalMethods, "methods", "methods")}
        ${statCard("boxes-stacked", index.packages.length, "packages", "packages", `<a href="/docs/visualizer">packages</a>`)}
        ${statCard("table-cells", index.totalStructs, "data types", "structs", `<a href="/docs/types">data types</a>`)}
        ${statCard("list-ul", index.totalEnums, "enums", "enums")}
      </div>
    </article>
    <article class="panel callout panel-callout">
      ${panelHeading("circle-play", "How to call a method")}
      <p>Send a POST request to <code>/srpc</code> with this JSON body. Replace <code>service</code>, <code>method</code>, and <code>params</code> with values from any method below.</p>
      <pre>{
  "srpc": "1.0",
  "service": "user.UserService",
  "method": "getUser",
  "params": { "id": "user-1" }
}</pre>
      <p class="meta" style="margin-top:0.75rem">Methods marked ${httpBadge("GET")} can also be called via <code>GET /srpc?service=...&amp;method=...&amp;params=...</code></p>
    </article>
    <article class="panel">
      ${panelHeading("layer-group", "All services")}
      <p class="meta">Browse every callable service grouped by contract package.</p>
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
    `<article class="panel">
      <h1>${icon("triangle-exclamation", "title-icon")} Page not found</h1>
      <p class="lead">There is no ${escapeHtml(kind)} named <code>${escapeHtml(name)}</code> in your contracts.</p>
      <p class="meta">${icon("house")} <a href="/docs">Back to overview</a></p>
    </article>`,
    { store }
  );
}
