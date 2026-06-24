import type { ServiceListing } from "../../src/contract-docs.ts";
import { escapeHtml } from "./escape.ts";
import type { PageContext } from "./types.ts";
import { icon } from "./ui.ts";

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
          `<li><a class="${structsActive ? "active" : ""}" href="/docs/${escapeHtml(packageName)}/structs"><span class="nav-icon struct-icon">${icon("table-cells")}</span> Structs (${pkg.structs.length})</a></li>`
        );
      }

      if (pkg && pkg.enums.length > 0) {
        const enumsActive =
          activePackage === packageName &&
          activeTypeKind === "enum" &&
          !activeTypeName;
        typeLinks.push(
          `<li><a class="${enumsActive ? "active" : ""}" href="/docs/${escapeHtml(packageName)}/enums"><span class="nav-icon enum-icon">${icon("list-ul")}</span> Enums (${pkg.enums.length})</a></li>`
        );
      }

      const serviceLinks = services
        .map(service => {
          const active =
            activePackage === packageName && activeService === service.name;
          return `<li><a class="${active ? "active" : ""}" href="/docs/${escapeHtml(packageName)}/${escapeHtml(service.name)}"><span class="nav-icon svc-icon">${icon("plug")}</span> ${escapeHtml(service.name)}</a></li>`;
        })
        .join("");

      const pkgActive =
        activePackage === packageName &&
        !activeService &&
        !activeTypeKind &&
        !activeTypeName;
      return `<li class="pkg"><a class="${pkgActive ? "active" : ""}" href="/docs/${escapeHtml(packageName)}"><span class="nav-icon pkg-icon">${icon("box")}</span> ${escapeHtml(packageName)}</a></li>${typeLinks.join("")}${serviceLinks}`;
    })
    .join("");

  const overviewActive =
    !activePackage && !activeService && !activeTypes && !activeVisualizer && !activeTypeKind;

  return `<aside class="sidebar">
    <p class="sidebar-brand"><a href="/docs">${icon("book")} SRPC API</a></p>
    <h2>${icon("compass")} Navigation</h2>
    <ul class="nav-list">
      <li><a class="${overviewActive ? "active" : ""}" href="/docs"><span class="nav-icon">${icon("house")}</span> Overview</a></li>
      <li><a class="${activeTypes ? "active" : ""}" href="/docs/types"><span class="nav-icon struct-icon">${icon("cubes")}</span> Data types</a></li>
      <li><a class="${activeVisualizer ? "active" : ""}" href="/docs/visualizer"><span class="nav-icon">${icon("diagram-project")}</span> Visualizer</a></li>
      ${packageNav}
    </ul>
  </aside>`;
}
