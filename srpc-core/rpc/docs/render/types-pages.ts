import type {
  ContractDocsStore,
  ContractPackageDocs,
  EnumDoc,
  StructDoc,
} from "../../src/contract-docs.ts";
import { escapeHtml } from "../escape.ts";
import { page } from "../layout.ts";
import { codeBlock } from "../code-block.ts";
import { cls, icon, panelHeading, statCard } from "../ui.ts";
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
          : `<h3 class="mb-2 mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">${icon("table-cells")} Objects</h3>
             <ul class="space-y-1">${types.structs
               .map(
                 struct =>
                   `<li><a href="/docs/${escapeHtml(packageName)}/structs/${escapeHtml(struct.name)}" class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-50 hover:text-brand">${icon("table-cells")} <code class="font-mono text-xs">${escapeHtml(struct.name)}</code> <span class="ml-auto font-mono text-xs text-zinc-400">${escapeHtml(struct.qualifiedName)}</span></a></li>`
               )
               .join("")}</ul>`;

      const enumLinks =
        types.enums.length === 0
          ? ""
          : `<h3 class="mb-2 mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">${icon("list-ul")} Fixed choices</h3>
             <ul class="space-y-1">${types.enums
               .map(
                 enumDoc =>
                   `<li><a href="/docs/${escapeHtml(packageName)}/enums/${escapeHtml(enumDoc.name)}" class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-50 hover:text-brand">${icon("list-ul")} <code class="font-mono text-xs">${escapeHtml(enumDoc.name)}</code> <span class="ml-auto text-xs text-zinc-400">${escapeHtml(enumDoc.qualifiedName)} · ${escapeHtml(enumDoc.values.join(" · "))}</span></a></li>`
               )
               .join("")}</ul>`;

      return `<section class="mb-8 border-b border-zinc-100 pb-8 last:mb-0 last:border-0 last:pb-0">
        <h3 class="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-zinc-500">${icon("box")} <a href="/docs/${escapeHtml(packageName)}" class="hover:text-brand">${escapeHtml(packageName)}</a> package</h3>
        <p class="${cls.meta} mt-1">${types.structs.length} object type${types.structs.length === 1 ? "" : "s"} · ${types.enums.length} fixed-choice type${types.enums.length === 1 ? "" : "s"} · <a href="/docs/${escapeHtml(packageName)}/structs" class="text-brand hover:text-brand-dark">all objects</a> · <a href="/docs/${escapeHtml(packageName)}/enums" class="text-brand hover:text-brand-dark">all choices</a></p>
        ${structLinks}
        ${enumLinks}
      </section>`;
    })
    .join("");

  return page(
    "Data shapes",
    `<article class="${cls.panel}">
      <h1 class="${cls.h1}">${icon("cubes", cls.h1Icon)} Data shapes</h1>
      <p class="${cls.lead}">
        The JSON shapes your APIs use — objects with named fields, and fixed lists of allowed values. Open any type to see its fields and a sample JSON object.
      </p>
      <div class="${cls.stats}">
        ${statCard("table-cells", index.totalStructs, "object types", "structs")}
        ${statCard("list-ul", index.totalEnums, "fixed choices", "enums")}
        ${statCard("boxes-stacked", index.packages.length, "packages", "packages")}
      </div>
    </article>
    <article class="${cls.panel}">
      ${panelHeading("layer-group", "Browse by package")}
      <p class="${cls.meta} mb-4">Click a type name to see every field and an example you can copy.</p>
      ${sections || `<p class="${cls.empty}">No data shapes found in your contracts yet.</p>`}
    </article>`,
    { store, activeTypes: true }
  );
}

export function renderPackageStructs(
  store: ContractDocsStore,
  pkg: ContractPackageDocs
): string {
  return page(
    `${pkg.package} objects`,
    `<article class="${cls.panel}">
      <h1 class="${cls.h1}">${icon("table-cells", cls.h1Icon)} ${escapeHtml(pkg.package)} objects</h1>
      <p class="${cls.lead}">JSON object types used in the <code class="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm">${escapeHtml(pkg.package)}</code> package.</p>
      <p class="${cls.meta}">${icon("cubes")} <a href="/docs/types" class="text-brand hover:text-brand-dark">All data shapes</a> · ${icon("box")} <a href="/docs/${escapeHtml(pkg.package)}" class="text-brand hover:text-brand-dark">Package overview</a></p>
    </article>
    <article class="${cls.panel}">
      ${panelHeading("table-cells", `Objects (${pkg.structs.length})`)}
      ${pkg.structs.length === 0 ? `<p class="${cls.empty}">No object types in this package.</p>` : `<div class="grid gap-4 sm:grid-cols-2">${pkg.structs.map(struct => renderStructCard(store, pkg.package, struct)).join("")}</div>`}
    </article>`,
    { store, activePackage: pkg.package, activeTypeKind: "struct" }
  );
}

export function renderPackageEnums(
  store: ContractDocsStore,
  pkg: ContractPackageDocs
): string {
  return page(
    `${pkg.package} choices`,
    `<article class="${cls.panel}">
      <h1 class="${cls.h1}">${icon("list-ul", cls.h1Icon)} ${escapeHtml(pkg.package)} fixed choices</h1>
      <p class="${cls.lead}">Fields that must be one of a fixed set of values in the <code class="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm">${escapeHtml(pkg.package)}</code> package.</p>
      <p class="${cls.meta}">${icon("cubes")} <a href="/docs/types" class="text-brand hover:text-brand-dark">All data shapes</a> · ${icon("box")} <a href="/docs/${escapeHtml(pkg.package)}" class="text-brand hover:text-brand-dark">Package overview</a></p>
    </article>
    <article class="${cls.panel}">
      ${panelHeading("list-ul", `Fixed choices (${pkg.enums.length})`)}
      ${pkg.enums.length === 0 ? `<p class="${cls.empty}">No fixed-choice types in this package.</p>` : `<div class="grid gap-4 sm:grid-cols-2">${pkg.enums.map(enumDoc => renderEnumCard(pkg.package, enumDoc)).join("")}</div>`}
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
    `<article class="${cls.panel}">
      <h1 class="${cls.h1}">${icon("table-cells", cls.h1Icon)} <code class="font-mono">${escapeHtml(struct.name)}</code></h1>
      <p class="${cls.lead}">A data object with ${struct.fields.length} field${struct.fields.length === 1 ? "" : "s"}. Full name: <code class="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm">${escapeHtml(struct.qualifiedName)}</code>.</p>
      <p class="${cls.meta}">${icon("cubes")} <a href="/docs/types" class="text-brand hover:text-brand-dark">All data shapes</a> · ${icon("table-cells")} <a href="/docs/${escapeHtml(packageName)}/structs" class="text-brand hover:text-brand-dark">All ${escapeHtml(packageName)} objects</a> · ${icon("box")} <a href="/docs/${escapeHtml(packageName)}" class="text-brand hover:text-brand-dark">${escapeHtml(packageName)} package</a></p>
    </article>
    <article class="${cls.panel}">
      ${panelHeading("list", "Fields in this object")}
      ${renderFieldsTable(store, packageName, struct)}
    </article>
    <article class="${cls.panel} bg-zinc-50">
      ${panelHeading("code", "Example JSON")}
      <p class="${cls.meta} mb-3">A sample object matching this struct. Optional fields are omitted.</p>
      ${codeBlock(exampleStructJson(struct))}
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
        `<tr class="border-b border-zinc-100 last:border-0"><td class="py-2.5 pr-4 text-sm text-zinc-500">${index + 1}</td><td class="py-2.5"><code class="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm">${escapeHtml(value)}</code></td></tr>`
    )
    .join("");

  return page(
    enumDoc.name,
    `<article class="${cls.panel}">
      <h1 class="${cls.h1}">${icon("list-ul", cls.h1Icon)} <code class="font-mono">${escapeHtml(enumDoc.name)}</code></h1>
      <p class="${cls.lead}">Must be one of ${enumDoc.values.length} allowed values. Full name: <code class="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm">${escapeHtml(enumDoc.qualifiedName)}</code>.</p>
      <p class="${cls.meta}">${icon("cubes")} <a href="/docs/types" class="text-brand hover:text-brand-dark">All data shapes</a> · ${icon("list-ul")} <a href="/docs/${escapeHtml(packageName)}/enums" class="text-brand hover:text-brand-dark">All ${escapeHtml(packageName)} choices</a> · ${icon("box")} <a href="/docs/${escapeHtml(packageName)}" class="text-brand hover:text-brand-dark">${escapeHtml(packageName)} package</a></p>
    </article>
    <article class="${cls.panel}">
      ${panelHeading("tags", "Allowed values")}
      <div class="overflow-x-auto"><table class="w-full text-left text-sm">
        <thead><tr class="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-400"><th class="pb-2 pr-4">#</th><th class="pb-2">Value</th></tr></thead>
        <tbody>${valueRows}</tbody>
      </table></div>
    </article>
    <article class="${cls.panel} bg-zinc-50">
      ${panelHeading("circle-info", "Usage")}
      <p class="${cls.meta} mb-3">When a field uses this type, send one of these exact string values.</p>
      ${codeBlock(JSON.stringify(enumDoc.values[0] ?? "VALUE", null, 2))}
    </article>`,
    {
      store,
      activePackage: packageName,
      activeTypeKind: "enum",
      activeTypeName: enumDoc.name,
    }
  );
}
