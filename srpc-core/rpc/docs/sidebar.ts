import type { ServiceListing } from "../../src/contract-docs.ts";
import { escapeHtml } from "./escape.ts";
import type { PageContext } from "./types.ts";
import { icon, navLink, pkgNavLink } from "./ui.ts";

export function renderSidebar(ctx: PageContext): string {
  const { store, activePackage, activeService, activeTypes, activeVisualizer, activeTypeKind, activeTypeName } = ctx;
  const byPackage = new Map<string, ServiceListing[]>();

  for (const service of store.getAllServices()) {
    const list = byPackage.get(service.package) ?? [];
    list.push(service);
    byPackage.set(service.package, list);
  }

  const packageNav = [...byPackage.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([packageName, services]) => {
      const pkg = store.getPackage(packageName);
      const typeLinks: string[] = [];

      if (pkg && pkg.structs.length > 0) {
        const structsActive =
          activePackage === packageName &&
          activeTypeKind === "struct" &&
          !activeTypeName;
        typeLinks.push(
          `<li class="ml-3"><a class="${navLink(structsActive)}" href="/docs/${escapeHtml(packageName)}/structs">${icon("table-cells")} Structs (${pkg.structs.length})</a></li>`
        );
      }

      if (pkg && pkg.enums.length > 0) {
        const enumsActive =
          activePackage === packageName &&
          activeTypeKind === "enum" &&
          !activeTypeName;
        typeLinks.push(
          `<li class="ml-3"><a class="${navLink(enumsActive)}" href="/docs/${escapeHtml(packageName)}/enums">${icon("list-ul")} Enums (${pkg.enums.length})</a></li>`
        );
      }

      const serviceLinks = services
        .map(service => {
          const active =
            activePackage === packageName && activeService === service.name;
          return `<li class="ml-3"><a class="${navLink(active)}" href="/docs/${escapeHtml(packageName)}/${escapeHtml(service.name)}">${icon("plug")} ${escapeHtml(service.name)}</a></li>`;
        })
        .join("");

      const pkgActive =
        activePackage === packageName &&
        !activeService &&
        !activeTypeKind &&
        !activeTypeName;
      return `<li class="mt-3">
        <a class="${pkgNavLink(pkgActive)}" href="/docs/${escapeHtml(packageName)}">${icon("box")} ${escapeHtml(packageName)}</a>
        <ul class="mt-1 space-y-0.5">${typeLinks.join("")}${serviceLinks}</ul>
      </li>`;
    })
    .join("");

  const overviewActive =
    !activePackage && !activeService && !activeTypes && !activeVisualizer && !activeTypeKind;

  return `<aside class="sidebar border-b border-zinc-200 bg-white md:sticky md:top-0 md:h-screen md:overflow-y-auto md:border-b-0 md:border-r">
    <div class="flex h-full flex-col overflow-y-auto p-4">
      <div class="mb-6 flex items-center justify-between gap-2">
        <a href="/docs" class="flex items-center gap-2 text-sm font-semibold text-brand">
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10">${icon("book")}</span>
          <span>SRPC API</span>
        </a>
      </div>
      <nav>
        <p class="mb-2 px-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">${icon("compass")} Navigation</p>
        <ul class="space-y-0.5">
          <li><a class="${navLink(overviewActive)}" href="/docs">${icon("house")} Start here</a></li>
          <li><a class="${navLink(false)}" href="/playground">${icon("flask")} Try in browser</a></li>
          <li><a class="${navLink(activeTypes ?? false)}" href="/docs/types">${icon("cubes")} Data shapes</a></li>
          <li><a class="${navLink(activeVisualizer ?? false)}" href="/docs/visualizer">${icon("diagram-project")} Map view</a></li>
        </ul>
        <p class="mb-2 mt-6 px-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">${icon("box")} Packages</p>
        <ul class="space-y-0.5">${packageNav}</ul>
      </nav>
    </div>
  </aside>`;
}
