import type { MethodDoc } from "../../src/contract-docs.ts";
import { escapeHtml } from "./escape.ts";

export function icon(name: string, className = ""): string {
  return `<i class="fa-solid fa-${name}${className ? ` ${className}` : ""}" aria-hidden="true"></i>`;
}

export function httpBadge(method: string): string {
  const verb = method.toUpperCase();
  const iconName =
    verb === "GET"
      ? "download"
      : verb === "POST"
        ? "paper-plane"
        : verb === "PUT"
          ? "pen"
          : verb === "PATCH"
            ? "wrench"
            : verb === "DELETE"
              ? "trash"
              : "bolt";
  return `<span class="badge http http-${verb.toLowerCase()}">${icon(iconName)} ${escapeHtml(verb)}</span>`;
}

export function methodChip(method: MethodDoc): string {
  const verb = method.httpMethod.toUpperCase();
  return `<span class="method-chip http-${verb.toLowerCase()}"><span class="verb">${escapeHtml(verb)}</span>${escapeHtml(method.name)}</span>`;
}

export function statCard(
  iconName: string,
  value: number | string,
  label: string,
  tone: string,
  labelHtml?: string
): string {
  return `<div class="stat stat-${tone}">
    <div class="stat-header">
      <span class="stat-label">${labelHtml ?? escapeHtml(label)}</span>
      <span class="stat-icon">${icon(iconName)}</span>
    </div>
    <strong class="stat-value">${value}</strong>
  </div>`;
}

export function panelHeading(iconName: string, text: string): string {
  return `<h2 class="panel-title">${icon(iconName, "panel-icon")} ${text}</h2>`;
}
