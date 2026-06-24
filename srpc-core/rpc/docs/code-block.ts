import { escapeHtml } from "./escape.ts";

const TOKEN_PATTERN =
  /"(?:\\.|[^"\\])*"(?=\s*:)|"(?:\\.|[^"\\])*"|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

export function highlightJson(json: string): string {
  const parts: string[] = [];
  let lastIndex = 0;

  for (const match of json.matchAll(TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    parts.push(escapeHtml(json.slice(lastIndex, index)));

    const token = match[0];
    const after = json.slice(index + token.length);
    const isKey = token.startsWith('"') && /^\s*:/.test(after);

    if (isKey) {
      parts.push(`<span class="json-key">${escapeHtml(token)}</span>`);
    } else if (token.startsWith('"')) {
      parts.push(`<span class="json-string">${escapeHtml(token)}</span>`);
    } else if (token === "true" || token === "false" || token === "null") {
      parts.push(`<span class="json-literal">${escapeHtml(token)}</span>`);
    } else {
      parts.push(`<span class="json-number">${escapeHtml(token)}</span>`);
    }

    lastIndex = index + token.length;
  }

  parts.push(escapeHtml(json.slice(lastIndex)));
  return parts.join("");
}

export function codeBlock(code: string): string {
  return `<div class="code-block">
    <pre class="code-pre"><code class="language-json">${highlightJson(code)}</code></pre>
  </div>`;
}
