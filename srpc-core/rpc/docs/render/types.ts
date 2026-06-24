import type {
  ContractDocsStore,
  ContractPackageDocs,
  EnumDoc,
  StructDoc,
} from "../../src/contract-docs.ts";
import { escapeHtml } from "../escape.ts";
import { buildTypeLinkIndex, linkifyContractType } from "../type-links.ts";
import { icon } from "../ui.ts";

export function renderStructCard(
  store: ContractDocsStore,
  packageName: string,
  struct: StructDoc
): string {
  const typeIndex = buildTypeLinkIndex(store);
  const fields = struct.fields
    .map(
      field =>
        `<li><span class="name">${escapeHtml(field.name)}${field.optional ? "?" : ""}</span> — ${linkifyContractType(field.type, typeIndex, packageName)}</li>`
    )
    .join("");

  return `<div class="type-card struct-card">
    <h4><span class="type-icon struct">${icon("table-cells")}</span> <a href="/docs/${escapeHtml(packageName)}/structs/${escapeHtml(struct.name)}"><code>${escapeHtml(struct.name)}</code></a></h4>
    <p class="qualified" style="margin:0 0 0.5rem;font-size:0.75rem;color:#a1a1aa">${escapeHtml(struct.qualifiedName)}</p>
    <ul class="fields">${fields || '<li class="empty">No fields</li>'}</ul>
  </div>`;
}

export function renderEnumCard(packageName: string, enumDoc: EnumDoc): string {
  return `<div class="type-card enum-card">
    <h4><span class="type-icon enum">${icon("list-ul")}</span> <a href="/docs/${escapeHtml(packageName)}/enums/${escapeHtml(enumDoc.name)}"><code>${escapeHtml(enumDoc.name)}</code></a></h4>
    <p class="qualified" style="margin:0 0 0.5rem;font-size:0.75rem;color:#a1a1aa">${escapeHtml(enumDoc.qualifiedName)}</p>
    <p class="meta">${enumDoc.values.map(escapeHtml).join(" · ")}</p>
  </div>`;
}

export function renderFieldsTable(
  store: ContractDocsStore,
  packageName: string,
  struct: StructDoc
): string {
  if (struct.fields.length === 0) {
    return `<p class="empty">This struct has no fields.</p>`;
  }

  const typeIndex = buildTypeLinkIndex(store);
  const rows = struct.fields
    .map(
      field => `<tr>
        <td><code>${escapeHtml(field.name)}</code></td>
        <td>${linkifyContractType(field.type, typeIndex, packageName)}</td>
        <td>${field.optional ? "Optional" : "Required"}</td>
      </tr>`
    )
    .join("");

  return `<table class="fields-table">
    <thead>
      <tr><th>Field</th><th>Type</th><th>Required</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
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
          <div style="display:flex;align-items:baseline;justify-content:space-between;gap:1rem;flex-wrap:wrap">
            <h2 style="margin-top:0;display:flex;align-items:center;gap:0.45rem">${icon("table-cells", "panel-icon")} Structs</h2>
            <a href="/docs/${escapeHtml(pkg.package)}/structs" style="font-size:0.8125rem">View all structs →</a>
          </div>
          <div class="type-grid">${pkg.structs.map(struct => renderStructCard(store, pkg.package, struct)).join("")}</div>
        </div>`;

  const enums =
    pkg.enums.length === 0
      ? ""
      : `<div style="margin-top:1.5rem">
          <div style="display:flex;align-items:baseline;justify-content:space-between;gap:1rem;flex-wrap:wrap">
            <h2 style="display:flex;align-items:center;gap:0.45rem">${icon("list-ul", "panel-icon")} Enums</h2>
            <a href="/docs/${escapeHtml(pkg.package)}/enums" style="font-size:0.8125rem">View all enums →</a>
          </div>
          <div class="type-grid">${pkg.enums.map(enumDoc => renderEnumCard(pkg.package, enumDoc)).join("")}</div>
        </div>`;

  return `<article class="panel">${structs}${enums}</article>`;
}
