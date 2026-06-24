import type { ContractDocsStore } from "../../src/contract-docs.ts";
import { escapeHtml } from "../escape.ts";
import { page } from "../layout.ts";
import { renderKeyConcepts, renderPlaygroundCallout, renderQuickStart } from "../guide.ts";
import { cls, httpBadge, icon, panelHeading, statCard } from "../ui.ts";
import { renderAllServices } from "./services.ts";

export function renderDocsIndex(store: ContractDocsStore): string {
  const { index } = store;

  return page(
    "Getting Started",
    `${renderQuickStart(store)}
    ${renderKeyConcepts()}
    ${renderPlaygroundCallout()}
    <article class="${cls.panel}">
      <h1 class="${cls.h1}">${icon("book-open", cls.h1Icon)} SRPC API reference</h1>
      <p class="${cls.lead}">
        This site lists every API your server exposes. Each page shows what to send, what you get back, and a copy-paste JSON example.
      </p>
      <div class="${cls.stats}">
        ${statCard("server", index.totalServices, "API groups", "services")}
        ${statCard("bolt", index.totalMethods, "actions", "methods")}
        ${statCard("boxes-stacked", index.packages.length, "packages", "packages", `<a href="/docs/visualizer" class="text-inherit hover:text-brand">packages</a>`)}
        ${statCard("table-cells", index.totalStructs, "data shapes", "structs", `<a href="/docs/types" class="text-inherit hover:text-brand">data shapes</a>`)}
        ${statCard("list-ul", index.totalEnums, "fixed choices", "enums")}
      </div>
    </article>
    <article class="${cls.panel} bg-zinc-50">
      ${panelHeading("circle-play", "How a request works")}
      <p class="${cls.meta} mb-4">Every call uses the same shape. Change <code class="rounded bg-white px-1.5 py-0.5 font-mono text-sm ring-1 ring-zinc-200">service</code>, <code class="rounded bg-white px-1.5 py-0.5 font-mono text-sm ring-1 ring-zinc-200">method</code>, and <code class="rounded bg-white px-1.5 py-0.5 font-mono text-sm ring-1 ring-zinc-200">params</code> to match the API you want.</p>
      <div class="mb-4 grid gap-3 sm:grid-cols-3">
        <div class="rounded-lg bg-white p-3 ring-1 ring-zinc-200">
          <p class="text-xs font-semibold uppercase tracking-wide text-zinc-400">service</p>
          <p class="mt-1 text-sm text-zinc-700">Which API group — e.g. <code class="font-mono text-xs">user.UserService</code></p>
        </div>
        <div class="rounded-lg bg-white p-3 ring-1 ring-zinc-200">
          <p class="text-xs font-semibold uppercase tracking-wide text-zinc-400">method</p>
          <p class="mt-1 text-sm text-zinc-700">Which action — e.g. <code class="font-mono text-xs">getUser</code></p>
        </div>
        <div class="rounded-lg bg-white p-3 ring-1 ring-zinc-200">
          <p class="text-xs font-semibold uppercase tracking-wide text-zinc-400">params</p>
          <p class="mt-1 text-sm text-zinc-700">Your input data as JSON</p>
        </div>
      </div>
      <p class="${cls.meta}">Read-only methods marked ${httpBadge("GET")} can also use a URL: <code class="rounded bg-white px-1.5 py-0.5 font-mono text-sm ring-1 ring-zinc-200">GET /srpc?service=...&amp;method=...&amp;params=...</code></p>
    </article>
    <article class="${cls.panel}">
      ${panelHeading("layer-group", "Browse all APIs")}
      <p class="${cls.meta} mb-4">Pick a package, open a service, then choose the method you need. Each method page has a full example.</p>
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
      <p class="${cls.lead}">We could not find a ${escapeHtml(kind)} named <code class="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm">${escapeHtml(name)}</code>.</p>
      <p class="${cls.meta}">${icon("house")} <a href="/docs" class="text-brand hover:text-brand-dark">Back to getting started</a></p>
    </article>`,
    { store }
  );
}
