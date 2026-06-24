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
          : `<h3 class="mb-2 mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">${icon("table-cells")} Structs</h3>
             <ul class="space-y-1">${types.structs
               .map(
                 struct =>
                   `<li><a href="/docs/${escapeHtml(packageName)}/structs/${escapeHtml(struct.name)}" class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-50 hover:text-brand">${icon("table-cells")} <code class="font-mono text-xs">${escapeHtml(struct.name)}</code> <span class="ml-auto font-mono text-xs text-zinc-400">${escapeHtml(struct.qualifiedName)}</span></a></li>`
               )
               .join("")}</ul>`;

      const enumLinks =
        types.enums.length === 0
          ? ""
          : `<h3 class="mb-2 mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">${icon("list-ul")} Enums</h3>
             <ul class="space-y-1">${types.enums
               .map(
                 enumDoc =>
                   `<li><a href="/docs/${escapeHtml(packageName)}/enums/${escapeHtml(enumDoc.name)}" class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-50 hover:text-brand">${icon("list-ul")} <code class="font-mono text-xs">${escapeHtml(enumDoc.name)}</code> <span class="ml-auto text-xs text-zinc-400">${escapeHtml(enumDoc.qualifiedName)} · ${escapeHtml(enumDoc.values.join(" · "))}</span></a></li>`
               )
               .join("")}</ul>`;

      return `<section class="mb-8 border-b border-zinc-100 pb-8 last:mb-0 last:border-0 last:pb-0">
        <h3 class="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-zinc-500">${icon("box")} <a href="/docs/${escapeHtml(packageName)}" class="hover:text-brand">${escapeHtml(packageName)}</a> package</h3>
        <p class="${cls.meta} mt-1">${types.structs.length} struct${types.structs.length === 1 ? "" : "s"} · ${types.enums.length} enum${types.enums.length === 1 ? "" : "s"} · <a href="/docs/${escapeHtml(packageName)}/structs" class="text-brand hover:text-brand-dark">all structs</a> · <a href="/docs/${escapeHtml(packageName)}/enums" class="text-brand hover:text-brand-dark">all enums</a></p>
        ${structLinks}
        ${enumLinks}
      </section>`;
    })
    .join("");

  return page(
    "Data types",
    `<article class="${cls.panel}">
      <h1 class="${cls.h1}">${icon("cubes", cls.h1Icon)} Data types</h1>
      <p class="${cls.lead}">
        Structs and enums defined in your contracts. These are the shapes of request bodies, response objects, and shared values used across services.
      </p>
      <div class="${cls.stats}">
        ${statCard("table-cells", index.totalStructs, "structs", "structs")}
        ${statCard("list-ul", index.totalEnums, "enums", "enums")}
        ${statCard("boxes-stacked", index.packages.length, "packages", "packages")}
      </div>
    </article>
    <article class="${cls.panel}">
      ${panelHeading("layer-group", "All structs &amp; enums")}
      <p class="${cls.meta} mb-4">Click any type to see its full field list and an example JSON object.</p>
      ${sections || `<p class="${cls.empty}">No structs or enums found in contracts.</p>`}
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
    `<article class="${cls.panel}">
      <h1 class="${cls.h1}">${icon("table-cells", cls.h1Icon)} ${escapeHtml(pkg.package)} structs</h1>
      <p class="${cls.lead}">All struct types in the <code class="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm">${escapeHtml(pkg.package)}</code> package from <code class="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm">${escapeHtml(pkg.file)}</code>.</p>
      <p class="${cls.meta}">${icon("cubes")} <a href="/docs/types" class="text-brand hover:text-brand-dark">All data types</a> · ${icon("box")} <a href="/docs/${escapeHtml(pkg.package)}" class="text-brand hover:text-brand-dark">Package overview</a></p>
    </article>
    <article class="${cls.panel}">
      ${panelHeading("table-cells", `Structs (${pkg.structs.length})`)}
      ${pkg.structs.length === 0 ? `<p class="${cls.empty}">No structs in this package.</p>` : `<div class="grid gap-4 sm:grid-cols-2">${pkg.structs.map(struct => renderStructCard(store, pkg.package, struct)).join("")}</div>`}
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
    `<article class="${cls.panel}">
      <h1 class="${cls.h1}">${icon("list-ul", cls.h1Icon)} ${escapeHtml(pkg.package)} enums</h1>
      <p class="${cls.lead}">All enum types in the <code class="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm">${escapeHtml(pkg.package)}</code> package from <code class="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm">${escapeHtml(pkg.file)}</code>.</p>
      <p class="${cls.meta}">${icon("cubes")} <a href="/docs/types" class="text-brand hover:text-brand-dark">All data types</a> · ${icon("box")} <a href="/docs/${escapeHtml(pkg.package)}" class="text-brand hover:text-brand-dark">Package overview</a></p>
    </article>
    <article class="${cls.panel}">
      ${panelHeading("list-ul", `Enums (${pkg.enums.length})`)}
      ${pkg.enums.length === 0 ? `<p class="${cls.empty}">No enums in this package.</p>` : `<div class="grid gap-4 sm:grid-cols-2">${pkg.enums.map(enumDoc => renderEnumCard(pkg.package, enumDoc)).join("")}</div>`}
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
      <p class="${cls.lead}">Struct <code class="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm">${escapeHtml(struct.qualifiedName)}</code> — a data object with ${struct.fields.length} field${struct.fields.length === 1 ? "" : "s"}.</p>
      <p class="${cls.meta}">${icon("cubes")} <a href="/docs/types" class="text-brand hover:text-brand-dark">All data types</a> · ${icon("table-cells")} <a href="/docs/${escapeHtml(packageName)}/structs" class="text-brand hover:text-brand-dark">All ${escapeHtml(packageName)} structs</a> · ${icon("box")} <a href="/docs/${escapeHtml(packageName)}" class="text-brand hover:text-brand-dark">${escapeHtml(packageName)} package</a></p>
    </article>
    <article class="${cls.panel}">
      ${panelHeading("list", "Fields")}
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
      <p class="${cls.lead}">Enum <code class="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm">${escapeHtml(enumDoc.qualifiedName)}</code> — one of ${enumDoc.values.length} allowed values.</p>
      <p class="${cls.meta}">${icon("cubes")} <a href="/docs/types" class="text-brand hover:text-brand-dark">All data types</a> · ${icon("list-ul")} <a href="/docs/${escapeHtml(packageName)}/enums" class="text-brand hover:text-brand-dark">All ${escapeHtml(packageName)} enums</a> · ${icon("box")} <a href="/docs/${escapeHtml(packageName)}" class="text-brand hover:text-brand-dark">${escapeHtml(packageName)} package</a></p>
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
      <p class="${cls.meta} mb-3">Use any of these string values when a field or parameter has type <code class="rounded bg-white px-1.5 py-0.5 font-mono text-sm ring-1 ring-zinc-200">${escapeHtml(enumDoc.qualifiedName)}</code>.</p>
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
