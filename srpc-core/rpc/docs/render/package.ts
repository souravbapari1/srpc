import type {
  ContractDocsStore,
  ContractPackageDocs,
} from "../../src/contract-docs.ts";
import { escapeHtml } from "../escape.ts";
import { page } from "../layout.ts";
import { icon, panelHeading, statCard } from "../ui.ts";
import { renderServiceCard } from "./services.ts";
import { renderTypeSection } from "./types.ts";

export function renderPackageDocs(
  store: ContractDocsStore,
  pkg: ContractPackageDocs
): string {
  return page(
    pkg.package,
    `<article class="panel panel-hero">
      <h1>${icon("box", "title-icon")} ${escapeHtml(pkg.package)} package</h1>
      <p class="lead">Contract types and services defined in <code>${escapeHtml(pkg.file)}</code>.</p>
      <div class="stats">
        ${statCard("plug", pkg.services.length, "services", "services")}
        ${statCard("table-cells", pkg.structs.length, "structs", "structs")}
        ${statCard("list-ul", pkg.enums.length, "enums", "enums")}
      </div>
    </article>
    <article class="panel">
      ${panelHeading("server", "Services in this package")}
      ${pkg.services.length === 0 ? '<p class="empty">No services.</p>' : pkg.services.map(service => renderServiceCard(pkg.package, service)).join("")}
    </article>
    ${renderTypeSection(store, pkg)}`,
    { store, activePackage: pkg.package }
  );
}
