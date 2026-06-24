import type {
  ContractDocsStore,
  ContractPackageDocs,
  EnumDoc,
  StructDoc,
} from "../../src/contract-docs.ts";
import { escapeHtml } from "../escape.ts";
import { buildTypeLinkIndex, linkifyContractType } from "../type-links.ts";
import { cls, icon, panelHeading } from "../ui.ts";

export function renderStructCard(
  store: ContractDocsStore,
  packageName: string,
  struct: StructDoc
): string {
  const typeIndex = buildTypeLinkIndex(store);
  const fields = struct.fields
    .map(
      field =>
        `<li class="text-sm text-zinc-600"><span class="font-medium text-zinc-900">${escapeHtml(field.name)}${field.optional ? "?" : ""}</span> — ${linkifyContractType(field.type, typeIndex, packageName)}</li>`
    )
    .join("");

  return `<div class="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
    <h4 class="flex items-center gap-2 text-sm font-semibold text-zinc-900">
      <span class="text-zinc-400">${icon("table-cells")}</span>
      <a href="/docs/${escapeHtml(packageName)}/structs/${escapeHtml(struct.name)}" class="hover:text-brand"><code class="font-mono">${escapeHtml(struct.name)}</code></a>
    </h4>
    <p class="mt-1 font-mono text-xs text-zinc-400">${escapeHtml(struct.qualifiedName)}</p>
    <ul class="mt-3 space-y-1">${fields || `<li class="${cls.empty}">No fields</li>`}</ul>
  </div>`;
}

export function renderEnumCard(packageName: string, enumDoc: EnumDoc): string {
  return `<div class="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
    <h4 class="flex items-center gap-2 text-sm font-semibold text-zinc-900">
      <span class="text-zinc-400">${icon("list-ul")}</span>
      <a href="/docs/${escapeHtml(packageName)}/enums/${escapeHtml(enumDoc.name)}" class="hover:text-brand"><code class="font-mono">${escapeHtml(enumDoc.name)}</code></a>
    </h4>
    <p class="mt-1 font-mono text-xs text-zinc-400">${escapeHtml(enumDoc.qualifiedName)}</p>
    <p class="${cls.meta} mt-3">${enumDoc.values.map(escapeHtml).join(" · ")}</p>
  </div>`;
}

export function renderFieldsTable(
  store: ContractDocsStore,
  packageName: string,
  struct: StructDoc
): string {
  if (struct.fields.length === 0) {
    return `<p class="${cls.empty}">This struct has no fields.</p>`;
  }

  const typeIndex = buildTypeLinkIndex(store);
  const rows = struct.fields
    .map(
      field => `<tr class="border-b border-zinc-100 last:border-0">
        <td class="py-2.5 pr-4"><code class="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm">${escapeHtml(field.name)}</code></td>
        <td class="py-2.5 pr-4 text-sm text-zinc-700">${linkifyContractType(field.type, typeIndex, packageName)}</td>
        <td class="py-2.5 text-sm text-zinc-500">${field.optional ? "Optional" : "Required"}</td>
      </tr>`
    )
    .join("");

  return `<div class="overflow-x-auto"><table class="w-full text-left text-sm">
    <thead>
      <tr class="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        <th class="pb-2 pr-4">Field</th><th class="pb-2 pr-4">Type</th><th class="pb-2">Required</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

export function exampleStructJson(struct: StructDoc): string {
  const obj: Record<string, unknown> = {};
  for (const field of struct.fields) {
    if (!field.optional) {
      obj[field.name] = exampleValueForFieldType(field.type);
    }
  }
  return JSON.stringify(obj, null, 2);
}

function exampleValueForFieldType(type: string): unknown {
  if (type.includes("string")) return "example";
  if (type.includes("int") || type.includes("number") || type.includes("float")) return 1;
  if (type.includes("boolean")) return true;
  if (type.endsWith("[]")) return [];
  if (type.startsWith("map<")) return {};
  return "…";
}

export function renderTypeSection(store: ContractDocsStore, pkg: ContractPackageDocs): string {
  if (pkg.structs.length === 0 && pkg.enums.length === 0) {
    return "";
  }

  const structs =
    pkg.structs.length === 0
      ? ""
      : `<div>
          <div class="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 class="${cls.sectionTitle} !mb-0">${icon("table-cells", "text-brand")} Structs</h2>
            <a href="/docs/${escapeHtml(pkg.package)}/structs" class="text-sm font-medium text-brand hover:text-brand-dark">View all →</a>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">${pkg.structs.map(struct => renderStructCard(store, pkg.package, struct)).join("")}</div>
        </div>`;

  const enums =
    pkg.enums.length === 0
      ? ""
      : `<div class="mt-8">
          <div class="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 class="${cls.sectionTitle} !mb-0">${icon("list-ul", "text-brand")} Enums</h2>
            <a href="/docs/${escapeHtml(pkg.package)}/enums" class="text-sm font-medium text-brand hover:text-brand-dark">View all →</a>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">${pkg.enums.map(enumDoc => renderEnumCard(pkg.package, enumDoc)).join("")}</div>
        </div>`;

  return `<article class="${cls.panel}">${structs}${enums}</article>`;
}
