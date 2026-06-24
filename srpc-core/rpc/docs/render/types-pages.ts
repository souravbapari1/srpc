import type {
  ContractDocsStore,
  ContractPackageDocs,
  EnumDoc,
  StructDoc,
} from "../../src/contract-docs.ts";
import { escapeHtml } from "../escape.ts";
import { page } from "../layout.ts";
import { icon, panelHeading, statCard } from "../ui.ts";
import {
  exampleStructJson,
  renderEnumCard,
  renderFieldsTable,
  renderStructCard,
} from "./types.ts";

export function renderTypesIndex(store: ContractDocsStore): string {
  const { index } = store;
  const byPackage = new Map<string, { structs: StructDoc[]; enums: EnumDoc[] }>();

  for (const pkg of index.packages) {
    const full = store.getPackage(pkg.name);
    if (!full) continue;
    byPackage.set(pkg.name, { structs: full.structs, enums: full.enums });
  }

  const sections = [...byPackage.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([packageName, types]) => {
      const structLinks =
        types.structs.length === 0
          ? ""
          : `<h3 style="margin:1rem 0 0.5rem;font-size:0.8125rem;text-transform:uppercase;letter-spacing:0.06em;color:#71717a;display:flex;align-items:center;gap:0.35rem">${icon("table-cells")} Structs</h3>
             <ul class="type-link-list">${types.structs
               .map(
                 struct =>
                   `<li><a href="/docs/${escapeHtml(packageName)}/structs/${escapeHtml(struct.name)}">${icon("table-cells")} <code>${escapeHtml(struct.name)}</code> <span class="qualified">${escapeHtml(struct.qualifiedName)}</span></a></li>`
               )
               .join("")}</ul>`;

      const enumLinks =
        types.enums.length === 0
          ? ""
          : `<h3 style="margin:1rem 0 0.5rem;font-size:0.8125rem;text-transform:uppercase;letter-spacing:0.06em;color:#71717a;display:flex;align-items:center;gap:0.35rem">${icon("list-ul")} Enums</h3>
             <ul class="type-link-list">${types.enums
               .map(
                 enumDoc =>
                   `<li><a href="/docs/${escapeHtml(packageName)}/enums/${escapeHtml(enumDoc.name)}">${icon("list-ul")} <code>${escapeHtml(enumDoc.name)}</code> <span class="qualified">${escapeHtml(enumDoc.qualifiedName)} · ${enumDoc.values.map(escapeHtml).join(" · ")}</span></a></li>`
               )
               .join("")}</ul>`;

      return `<section class="pkg-section">
        <h3>${icon("box")} <a href="/docs/${escapeHtml(packageName)}">${escapeHtml(packageName)}</a> package</h3>
        <p class="meta">${types.structs.length} struct${types.structs.length === 1 ? "" : "s"} · ${types.enums.length} enum${types.enums.length === 1 ? "" : "s"} · <a href="/docs/${escapeHtml(packageName)}/structs">all structs</a> · <a href="/docs/${escapeHtml(packageName)}/enums">all enums</a></p>
        ${structLinks}
        ${enumLinks}
      </section>`;
    })
    .join("");

  return page(
    "Data types",
    `<article class="panel panel-hero">
      <h1>${icon("cubes", "title-icon")} Data types</h1>
      <p class="lead">
        Structs and enums defined in your contracts. These are the shapes of request bodies, response objects, and shared values used across services.
      </p>
      <div class="stats">
        ${statCard("table-cells", index.totalStructs, "structs", "structs")}
        ${statCard("list-ul", index.totalEnums, "enums", "enums")}
        ${statCard("boxes-stacked", index.packages.length, "packages", "packages")}
      </div>
    </article>
    <article class="panel">
      ${panelHeading("layer-group", "All structs &amp; enums")}
      <p class="meta">Click any type to see its full field list and an example JSON object.</p>
      ${sections || '<p class="empty">No structs or enums found in contracts.</p>'}
    </article>`,
    { store, activeTypes: true }
  );
}

export function renderPackageStructs(
  store: ContractDocsStore,
  pkg: ContractPackageDocs
): string {
  return page(
    `${pkg.package} structs`,
    `<article class="panel panel-hero">
      <h1>${icon("table-cells", "title-icon")} ${escapeHtml(pkg.package)} structs</h1>
      <p class="lead">All struct types in the <code>${escapeHtml(pkg.package)}</code> package from <code>${escapeHtml(pkg.file)}</code>.</p>
      <p class="meta">${icon("cubes")} <a href="/docs/types">All data types</a> · ${icon("box")} <a href="/docs/${escapeHtml(pkg.package)}">Package overview</a></p>
    </article>
    <article class="panel">
      ${panelHeading("table-cells", `Structs (${pkg.structs.length})`)}
      ${pkg.structs.length === 0 ? '<p class="empty">No structs in this package.</p>' : `<div class="type-grid">${pkg.structs.map(struct => renderStructCard(store, pkg.package, struct)).join("")}</div>`}
    </article>`,
    { store, activePackage: pkg.package, activeTypeKind: "struct" }
  );
}

export function renderPackageEnums(
  store: ContractDocsStore,
  pkg: ContractPackageDocs
): string {
  return page(
    `${pkg.package} enums`,
    `<article class="panel panel-hero">
      <h1>${icon("list-ul", "title-icon")} ${escapeHtml(pkg.package)} enums</h1>
      <p class="lead">All enum types in the <code>${escapeHtml(pkg.package)}</code> package from <code>${escapeHtml(pkg.file)}</code>.</p>
      <p class="meta">${icon("cubes")} <a href="/docs/types">All data types</a> · ${icon("box")} <a href="/docs/${escapeHtml(pkg.package)}">Package overview</a></p>
    </article>
    <article class="panel">
      ${panelHeading("list-ul", `Enums (${pkg.enums.length})`)}
      ${pkg.enums.length === 0 ? '<p class="empty">No enums in this package.</p>' : `<div class="type-grid">${pkg.enums.map(enumDoc => renderEnumCard(pkg.package, enumDoc)).join("")}</div>`}
    </article>`,
    { store, activePackage: pkg.package, activeTypeKind: "enum" }
  );
}

export function renderStructDocs(
  store: ContractDocsStore,
  packageName: string,
  struct: StructDoc
): string {
  return page(
    struct.name,
    `<article class="panel panel-hero">
      <h1>${icon("table-cells", "title-icon")} <code>${escapeHtml(struct.name)}</code></h1>
      <p class="lead">Struct <code>${escapeHtml(struct.qualifiedName)}</code> — a data object with ${struct.fields.length} field${struct.fields.length === 1 ? "" : "s"}.</p>
      <p class="meta">${icon("cubes")} <a href="/docs/types">All data types</a> · ${icon("table-cells")} <a href="/docs/${escapeHtml(packageName)}/structs">All ${escapeHtml(packageName)} structs</a> · ${icon("box")} <a href="/docs/${escapeHtml(packageName)}">${escapeHtml(packageName)} package</a></p>
    </article>
    <article class="panel">
      ${panelHeading("list", "Fields")}
      ${renderFieldsTable(store, packageName, struct)}
    </article>
    <article class="panel callout panel-callout">
      ${panelHeading("code", "Example JSON")}
      <p>A sample object matching this struct. Optional fields are omitted.</p>
      <pre>${escapeHtml(exampleStructJson(struct))}</pre>
    </article>`,
    {
      store,
      activePackage: packageName,
      activeTypeKind: "struct",
      activeTypeName: struct.name,
    }
  );
}

export function renderEnumDocs(
  store: ContractDocsStore,
  packageName: string,
  enumDoc: EnumDoc
): string {
  const valueRows = enumDoc.values
    .map(
      (value, index) =>
        `<tr><td>${index + 1}</td><td><code>${escapeHtml(value)}</code></td></tr>`
    )
    .join("");

  return page(
    enumDoc.name,
    `<article class="panel panel-hero">
      <h1>${icon("list-ul", "title-icon")} <code>${escapeHtml(enumDoc.name)}</code></h1>
      <p class="lead">Enum <code>${escapeHtml(enumDoc.qualifiedName)}</code> — one of ${enumDoc.values.length} allowed values.</p>
      <p class="meta">${icon("cubes")} <a href="/docs/types">All data types</a> · ${icon("list-ul")} <a href="/docs/${escapeHtml(packageName)}/enums">All ${escapeHtml(packageName)} enums</a> · ${icon("box")} <a href="/docs/${escapeHtml(packageName)}">${escapeHtml(packageName)} package</a></p>
    </article>
    <article class="panel">
      ${panelHeading("tags", "Allowed values")}
      <table class="fields-table">
        <thead><tr><th>#</th><th>Value</th></tr></thead>
        <tbody>${valueRows}</tbody>
      </table>
    </article>
    <article class="panel callout panel-callout">
      ${panelHeading("circle-info", "Usage")}
      <p>Use any of these string values when a field or parameter has type <code>${escapeHtml(enumDoc.qualifiedName)}</code>.</p>
      <pre>${escapeHtml(JSON.stringify(enumDoc.values[0] ?? "VALUE", null, 2))}</pre>
    </article>`,
    {
      store,
      activePackage: packageName,
      activeTypeKind: "enum",
      activeTypeName: enumDoc.name,
    }
  );
}
