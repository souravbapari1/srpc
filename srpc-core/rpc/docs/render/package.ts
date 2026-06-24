import type {
  ContractDocsStore,
  ContractPackageDocs,
} from "../../src/contract-docs.ts";
import { escapeHtml } from "../escape.ts";
import { page } from "../layout.ts";
import { cls, icon, panelHeading, statCard } from "../ui.ts";
import { renderServiceCard } from "./services.ts";
import { renderTypeSection } from "./types.ts";

export function renderPackageDocs(
  store: ContractDocsStore,
  pkg: ContractPackageDocs
): string {
  return page(
    pkg.package,
    `<article class="${cls.panel}">
      <h1 class="${cls.h1}">${icon("box", cls.h1Icon)} ${escapeHtml(pkg.package)} package</h1>
      <p class="${cls.lead}">Contract types and services defined in <code class="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm">${escapeHtml(pkg.file)}</code>.</p>
      <div class="${cls.stats}">
        ${statCard("plug", pkg.services.length, "services", "services")}
        ${statCard("table-cells", pkg.structs.length, "structs", "structs")}
        ${statCard("list-ul", pkg.enums.length, "enums", "enums")}
      </div>
    </article>
    <article class="${cls.panel}">
      ${panelHeading("server", "Services in this package")}
      ${pkg.services.length === 0 ? `<p class="${cls.empty}">No services.</p>` : pkg.services.map(service => renderServiceCard(pkg.package, service)).join("")}
    </article>
    ${renderTypeSection(store, pkg)}`,
    { store, activePackage: pkg.package }
  );
}
