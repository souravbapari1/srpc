type CodeLanguage = "srpc" | "typescript" | "json" | "shell";

const C = {
  keyword: "#d73a49",
  type: "#0550ae",
  string: "#0a3069",
  decorator: "#6639ba",
  comment: "#6e7781",
  fn: "#8250df",
  prop: "#0550ae",
  punct: "#24292f",
  cmd: "#116329",
  plain: "#24292f",
} as const;

export function languageFromTitle(title?: string): CodeLanguage {
  if (!title) return "typescript";

  const lower = title.toLowerCase();

  if (lower.endsWith(".ctr") || lower.endsWith(".rpc")) return "srpc";
  if (lower.endsWith(".json")) return "json";
  if (
    lower === "terminal" ||
    lower === "bash" ||
    lower === "shell" ||
    lower.endsWith(".sh")
  ) {
    return "shell";
  }

  return "typescript";
}

export function highlightCode(code: string, language: CodeLanguage): string {
  return code
    .replace(/\n$/, "")
    .split("\n")
    .map(line => {
      switch (language) {
        case "srpc":
          return highlightSrpcLine(line);
        case "json":
          return highlightJsonLine(line);
        case "shell":
          return highlightShellLine(line);
        default:
          return highlightTypeScriptLine(line);
      }
    })
    .join("\n");
}

function paint(text: string, color: string): string {
  return `<span style="color:${color}">${escapeHtml(text)}</span>`;
}

function paintHtml(safeHtml: string, color: string): string {
  return `<span style="color:${color}">${safeHtml}</span>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Replace matches only in plain-text segments (not inside HTML tags). */
function replacePlain(
  html: string,
  pattern: RegExp,
  replacer: (match: string, ...args: string[]) => string
): string {
  return html
    .split(/(<span[^>]*>.*?<\/span>)/g)
    .map((part, index) => {
      if (index % 2 === 1) return part;
      return part.replace(pattern, replacer as (substring: string, ...args: string[]) => string);
    })
    .join("");
}

function paintWords(
  html: string,
  words: string[],
  color: string
): string {
  let result = html;

  for (const word of words) {
    result = replacePlain(
      result,
      new RegExp(`\\b(${word})\\b`, "g"),
      m => paint(m, color)
    );
  }

  return result;
}

function highlightSrpcLine(line: string): string {
  let result = escapeHtml(line);

  result = replacePlain(
    result,
    /@(get|post|put|patch|delete)\b/g,
    m => paint(m, C.decorator)
  );

  result = paintWords(result, ["package", "struct", "service", "enum"], C.keyword);
  result = paintWords(
    result,
    ["string", "number", "boolean", "date", "datetime"],
    C.type
  );

  result = replacePlain(
    result,
    /\b([A-Z][A-Za-z0-9_]*)\b/g,
    m => paint(m, C.type)
  );

  result = replacePlain(result, /=&gt;/g, m => paintHtml(m, C.punct));
  result = replacePlain(
    result,
    /[{}[\]:?]/g,
    m => paint(m, C.punct)
  );

  return result;
}

function highlightTypeScriptLine(line: string): string {
  if (line.trim().startsWith("//")) {
    return paint(line, C.comment);
  }

  let result = escapeHtml(line);

  result = replacePlain(
    result,
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/g,
    m => paint(m, C.string)
  );

  result = paintWords(
    result,
    [
      "import",
      "export",
      "from",
      "const",
      "let",
      "await",
      "async",
      "return",
      "new",
      "type",
      "interface",
    ],
    C.keyword
  );

  result = replacePlain(
    result,
    /\b([A-Z][A-Za-z0-9_]*)\b/g,
    m => paint(m, C.type)
  );

  result = replacePlain(
    result,
    /\b([a-zA-Z_][\w]*)(?=\s*\()/g,
    m => paint(m, C.fn)
  );

  result = replacePlain(
    result,
    /\b(\w+)(?=\s*:)/g,
    m => paint(m, C.prop)
  );

  result = replacePlain(
    result,
    /[{}[\]();,.]/g,
    m => paint(m, C.punct)
  );

  return result;
}

function highlightJsonLine(line: string): string {
  let result = escapeHtml(line);

  result = replacePlain(
    result,
    /"([^"\\]|\\.)*"(?=\s*:)/g,
    m => paint(m, C.prop)
  );

  result = replacePlain(
    result,
    /"([^"\\]|\\.)*"/g,
    m => paint(m, C.string)
  );

  result = replacePlain(
    result,
    /\b(true|false|null)\b/g,
    m => paint(m, C.keyword)
  );

  result = replacePlain(
    result,
    /-?\d+(?:\.\d+)?/g,
    m => paint(m, C.type)
  );

  result = replacePlain(
    result,
    /[{}[\]:,]/g,
    m => paint(m, C.punct)
  );

  return result;
}

function highlightShellLine(line: string): string {
  if (line.trim().startsWith("#")) {
    return paint(line, C.comment);
  }

  let result = escapeHtml(line);

  result = replacePlain(
    result,
    /\b(cd|bun|npm|run|install|node)\b/g,
    m => paint(m, C.cmd)
  );

  result = replacePlain(
    result,
    /("[^"]*"|'[^']*')/g,
    m => paint(m, C.string)
  );

  return result;
}
